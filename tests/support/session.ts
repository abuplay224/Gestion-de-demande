import type { SessionUser } from "@/lib/session";

// Session simulée pour les tests d’intégration (voir le mock de @/lib/session dans integration-setup.ts).
export const AGENT: SessionUser = { id: "agent-1", name: "Agent Test", email: "agent@doztra.test", role: "agent" };
export const ADMIN: SessionUser = { id: "admin-1", name: "Admin Test", email: "admin@doztra.test", role: "admin" };

const g = globalThis as unknown as { __testUser?: SessionUser | null };

/** Définit l’utilisateur connecté pour la suite du test (null = visiteur sans session). */
export function asUser(user: SessionUser | null) {
  g.__testUser = user;
}

export function currentTestUser(): SessionUser | null {
  return g.__testUser === undefined ? AGENT : g.__testUser;
}
