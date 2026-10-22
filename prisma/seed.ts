// Jeu de données fictives : `npm run db:seed` (base de développement)
// ou `npm run db:test:seed` (base de test). Idempotent : les demandes déjà présentes sont ignorées.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { buildSeed } from "./seed-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n’est pas défini");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const { count } = await prisma.customerRequest.createMany({
      data: buildSeed(),
      skipDuplicates: true,
    });
    console.log(`${count} demande(s) fictive(s) ajoutée(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
