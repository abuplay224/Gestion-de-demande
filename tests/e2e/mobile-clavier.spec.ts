import { expect, test } from "@playwright/test";
import { resetDb } from "./db";

test.beforeEach(async () => {
  await resetDb();
});

test.describe("R16 — mobile 375 px", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test("cartes, aucune barre de défilement horizontal, actions accessibles", async ({ page }) => {
    await page.goto("/demandes");
    await expect(page.getByRole("table")).toBeHidden();
    const card = page.getByRole("listitem").filter({ hasText: "Société Minière de Boké" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "Retirer la priorité" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await card.getByRole("button", { name: /Voir la demande/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("le formulaire tient dans la largeur", async ({ page }) => {
    await page.goto("/demandes/nouvelle");
    await expect(page.getByLabel(/Nom du client/)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("R16 — parcours complet au clavier", async ({ page }) => {
  await page.goto("/demandes");

  // Tabulation jusqu’au bouton d’ajout puis Entrée
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    if (await page.getByRole("link", { name: "Ajouter une demande" }).first().evaluate((el) => el === document.activeElement)) break;
  }
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/demandes\/nouvelle$/);

  await expect(page.getByLabel(/Nom du client/)).toBeFocused();
  await page.keyboard.type("Clavier Seul");
  await page.keyboard.press("Tab"); // e-mail
  await page.keyboard.press("Tab"); // téléphone
  await page.keyboard.press("Tab"); // objet
  await page.keyboard.type("Saisie au clavier");
  await page.keyboard.press("Tab"); // description
  await page.keyboard.type("Demande saisie uniquement au clavier.");
  await page.keyboard.press("Tab"); // Annuler
  await page.keyboard.press("Tab"); // Enregistrer
  await expect(page.getByRole("button", { name: "Enregistrer" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Demande enregistrée")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Clavier Seul" })).toBeVisible();
});
