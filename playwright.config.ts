import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

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
    baseURL: `http://localhost:${PORT}`,
    channel: "msedge", // navigateur déjà installé, aucun téléchargement
    locale: "fr-FR",
    timezoneId: "Africa/Conakry",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "bureau", use: { ...devices["Desktop Edge"], channel: "msedge", viewport: { width: 1320, height: 900 } } },
  ],
  webServer: {
    command: `node scripts/with-test-db.mjs npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/demandes`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
