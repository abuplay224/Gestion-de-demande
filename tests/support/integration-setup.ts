import "dotenv/config";
import { afterAll, vi } from "vitest";

// Les tests d’intégration tournent exclusivement sur la base de test.
const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) throw new Error("DATABASE_URL_TEST est absent du fichier .env");
if (testUrl === process.env.DATABASE_URL || !/test/i.test(new URL(testUrl).pathname)) {
  throw new Error("DATABASE_URL_TEST doit désigner une base de test distincte (nom contenant « test »)");
}
process.env.DATABASE_URL = testUrl;

// Fonctions Next.js sans objet hors d’une requête.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
});
