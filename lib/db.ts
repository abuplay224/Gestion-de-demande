import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Client Prisma partagé, serveur uniquement (survit au rechargement à chaud en développement).
const g = globalThis as unknown as { __doztraPrisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n’est pas défini");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export const prisma = g.__doztraPrisma ?? createClient();
if (process.env.NODE_ENV !== "production") g.__doztraPrisma = prisma;
