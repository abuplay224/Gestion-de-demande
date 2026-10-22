import { defineConfig, devices } from "@playwright/test";
import { STATE } from "./tests/e2e/users";

const PORT = 3200;
const BASE_URL = `http://localhost:${PORT}`;

// Parcours de bout en bout sur la base de test (DATABASE_URL_TEST), réinitialisée par chaque test.
// Prérequis : `npm run build` (le script test:e2e s’en charge).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1, // une seule base de test partagée
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    channel: "msedge", // navigateur déjà installé, aucun téléchargement
    locale: "fr-FR",
    timezoneId: "Africa/Conakry",
    trace: "retain-on-failure",
  },
  projects: [
    // Crée les comptes admin et agent puis enregistre leurs sessions
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "bureau",
      dependencies: ["setup"],
      // Par défaut, les parcours tournent avec la session de l’agent
      use: { ...devices["Desktop Edge"], channel: "msedge", viewport: { width: 1320, height: 900 }, storageState: STATE.agent },
    },
  ],
  webServer: {
    command: `node scripts/with-test-db.mjs npx next start -p ${PORT}`,
    url: `${BASE_URL}/connexion`,
    env: { BETTER_AUTH_URL: BASE_URL },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
