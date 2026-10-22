import { expect, test as setup } from "@playwright/test";
import { E2E_ADMIN, E2E_AGENT, PASSWORD, STATE } from "./users";

// Connecte les comptes créés par global-setup et enregistre leur session.
setup("sessions admin et agent", async ({ browser }) => {
  for (const [user, file] of [
    [E2E_ADMIN, STATE.admin],
    [E2E_AGENT, STATE.agent],
  ] as const) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/connexion");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/demandes$/);
    await context.storageState({ path: file });
    await context.close();
  }
});
