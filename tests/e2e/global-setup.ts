import { execSync } from "node:child_process";

// Applique les migrations sur la base de test et recrée les comptes admin / agent.
export default function globalSetup() {
  execSync("node scripts/with-test-db.mjs npx prisma migrate deploy", { stdio: "inherit" });
  execSync("node scripts/with-test-db.mjs npx tsx tests/e2e/seed-users.ts", { stdio: "inherit" });
}
