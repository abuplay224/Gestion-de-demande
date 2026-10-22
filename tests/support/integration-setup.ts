import "dotenv/config";
import { afterAll, beforeEach, vi } from "vitest";

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
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));

// Session simulée : même logique de refus que lib/session.ts, utilisateur piloté par asUser().
vi.mock("@/lib/session", async () => {
  const { AuthError } = await import("@/lib/errors");
  const { currentTestUser } = await import("./session");
  const requireUser = async () => {
    const user = currentTestUser();
    if (!user) throw new AuthError("Accès réservé aux collaborateurs autorisés. Reconnectez-vous.");
    return user;
  };
  return {
    getCurrentUser: async () => currentTestUser(),
    requireUser,
    requireAdmin: async () => {
      const user = await requireUser();
      if (user.role !== "admin") throw new AuthError("Action réservée aux administrateurs.");
      return user;
    },
    requirePageUser: requireUser,
  };
});

beforeEach(async () => {
  const { asUser, AGENT } = await import("./session");
  asUser(AGENT);
});

afterAll(async () => {
  const { prisma } = await import("@/lib/db");
  await prisma.$disconnect();
});
