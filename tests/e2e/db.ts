import "dotenv/config";
import { Client } from "pg";
import { buildSeed } from "../../prisma/seed-data";

function testUrl() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url || url === process.env.DATABASE_URL || !/test/i.test(new URL(url).pathname)) {
    throw new Error("DATABASE_URL_TEST doit désigner une base de test distincte (nom contenant « test »)");
  }
  return url.replace(/\?schema=public$/, "");
}

async function withClient<T>(fn: (c: Client) => Promise<T>) {
  const c = new Client({ connectionString: testUrl() });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

/** Vide la base de test puis, si demandé, recharge les 26 demandes du prototype. */
export function resetDb({ seed = true } = {}) {
  return withClient(async (c) => {
    await c.query(`TRUNCATE TABLE customer_requests`);
    if (!seed) return;
    for (const r of buildSeed()) {
      await c.query(
        `INSERT INTO customer_requests (id, customer_name, customer_email, customer_phone, subject, description, is_priority, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.id, r.customerName, r.customerEmail, r.customerPhone, r.subject, r.description, r.isPriority, r.createdAt, r.updatedAt]
      );
    }
  });
}

export function countRows(where = "true", params: unknown[] = []) {
  return withClient(async (c) => (await c.query(`SELECT count(*)::int AS n FROM customer_requests WHERE ${where}`, params)).rows[0].n as number);
}
