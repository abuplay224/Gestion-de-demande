// Recrée les comptes de test e2e (exécuté par global-setup via tsx, sur la base de test).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { createAuth, createCredentialUser } from "../../lib/auth-config";
import { E2E_ADMIN, E2E_AGENT, PASSWORD } from "./users";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !/test/i.test(new URL(url).pathname)) throw new Error("Base de test attendue");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" CASCADE`);
    const auth = createAuth(prisma);
    for (const u of [E2E_ADMIN, E2E_AGENT]) await createCredentialUser(auth, { ...u, password: PASSWORD });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
