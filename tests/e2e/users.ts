// Comptes de test des parcours de bout en bout (base de test uniquement).
export const PASSWORD = "motdepasse-e2e-123";

export const E2E_ADMIN = { name: "Alpha Admin", email: "admin@doztra.test", role: "admin" as const };
export const E2E_AGENT = { name: "Binta Agent", email: "agent@doztra.test", role: "agent" as const };

export const STATE = {
  admin: "tests/e2e/.auth/admin.json",
  agent: "tests/e2e/.auth/agent.json",
};
