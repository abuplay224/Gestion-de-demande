// Exécute une commande en pointant DATABASE_URL sur la base de test (DATABASE_URL_TEST).
// Usage : node scripts/with-test-db.mjs <commande> [arguments…]
import "dotenv/config";
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  console.error("DATABASE_URL_TEST est absent du fichier .env");
  process.exit(1);
}

const [cmd, ...args] = process.argv.slice(2);
const result = spawnSync(cmd, args, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(result.status ?? 1);
