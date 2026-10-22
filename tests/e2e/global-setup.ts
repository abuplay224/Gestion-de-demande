import { execSync } from "node:child_process";

// Applique les migrations sur la base de test avant les parcours.
export default function globalSetup() {
  execSync("node scripts/with-test-db.mjs npx prisma migrate deploy", { stdio: "inherit" });
}
