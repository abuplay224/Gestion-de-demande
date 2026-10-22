import { expect, test } from "@playwright/test";
import { countRows, resetDb } from "./db";

test.beforeEach(async () => {
  await resetDb();
});

const row = (page: import("@playwright/test").Page, text: string) =>
  page.getByRole("row").filter({ hasText: text });

test("R09 — marquer comme prioritaire : badge, remontée en tête, persistance", async ({ page }) => {
  await page.goto("/demandes");
  const mariama = row(page, "Mariama Diallo");
  await expect(mariama).toContainText("Normale");

  await mariama.getByRole("button", { name: "Marquer comme prioritaire" }).click();

  await expect(page.getByText("Demande marquée comme prioritaire")).toBeVisible();
  await expect(mariama).toContainText("Prioritaire");
  await expect(mariama.getByRole("button", { name: "Retirer la priorité" })).toBeVisible();
  // Prioritaires triées par date : Mariama (21 oct. 01:10) passe entre Société Minière et Hôtel Kaloum
  await expect(page.getByRole("row").nth(2)).toContainText("Mariama Diallo");
  await expect(page.getByText("26 demandes · 4 prioritaires")).toBeVisible();

  await page.reload();
  await expect(row(page, "Mariama Diallo")).toContainText("Prioritaire");
  expect(await countRows("customer_name = $1 AND is_priority", ["Mariama Diallo"])).toBe(1);
});

test("R10 — retirer la priorité renvoie la demande dans l’ordre chronologique", async ({ page }) => {
  await page.goto("/demandes");
  await row(page, "Hôtel Kaloum").getByRole("button", { name: "Retirer la priorité" }).click();

  await expect(page.getByText("Priorité retirée")).toBeVisible();
  await expect(row(page, "Hôtel Kaloum")).toContainText("Normale");
  // Après les 2 prioritaires restantes : Mariama (21 oct. 01:10), Orange Guinée (20 oct. 05:08), Hôtel Kaloum (20 oct. 02:05)
  await expect(page.getByRole("row").nth(3)).toContainText("Mariama Diallo");
  await expect(page.getByRole("row").nth(4)).toContainText("Orange Guinée");
  await expect(page.getByRole("row").nth(5)).toContainText("Hôtel Kaloum");
});

test("R17 — une modification faite dans une autre session est visible après actualisation", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await a.goto("/demandes");
  await b.goto("/demandes");

  await row(a, "Groupe Sonoco").getByRole("button", { name: "Marquer comme prioritaire" }).click();
  await expect(row(a, "Groupe Sonoco")).toContainText("Prioritaire");

  await expect(row(b, "Groupe Sonoco")).toContainText("Normale"); // pas de temps réel
  await b.reload();
  await expect(row(b, "Groupe Sonoco")).toContainText("Prioritaire");
});

test("R07 — aucune demande : état vide et bouton d’ajout", async ({ page }) => {
  await resetDb({ seed: false });
  await page.goto("/demandes");
  await expect(page.getByText("Aucune demande pour le moment")).toBeVisible();
  await expect(page.getByText("Aucune demande enregistrée")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Ajouter une demande" }).click();
  await expect(page).toHaveURL(/\/demandes\/nouvelle$/);
});

test("R08 — pagination : 20 par page, précédent/suivant, page hors bornes", async ({ page }) => {
  await page.goto("/demandes");
  await expect(page.getByText("Page 1 sur 2 · 1–20 sur 26")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(21); // en-tête + 20
  await expect(page.getByRole("button", { name: /Précédent/ })).toBeDisabled();

  await page.getByRole("link", { name: /Suivant/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Page 2 sur 2 · 21–26 sur 26")).toBeVisible();
  await expect(page.getByRole("row").last()).toContainText("Banque Islamique de Guinée");
  await expect(page.getByRole("button", { name: /Suivant/ })).toBeDisabled();

  await page.goto("/demandes?page=9999");
  await expect(page.getByText("Page 2 sur 2 · 21–26 sur 26")).toBeVisible();
});

test("panneau de détail : contenu, Échap et retour du focus", async ({ page }) => {
  await page.goto("/demandes");
  const view = page.getByRole("button", { name: "Voir la demande de Hôtel Kaloum" });
  await view.click();

  const dialog = page.getByRole("dialog", { name: "Coupure du service depuis ce matin" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Fermer le détail" })).toBeFocused();
  await expect(dialog).toContainText("Depuis 7h ce matin");
  await expect(dialog.getByRole("link", { name: "+224 657 33 90 01" })).toHaveAttribute("href", "tel:+224657339001");
  await expect(dialog.getByText("Non renseigné")).toBeVisible(); // pas d’e-mail
  await expect(dialog).toContainText("Africa/Conakry");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(view).toBeFocused();
});

test("la priorité se modifie aussi depuis le panneau", async ({ page }) => {
  await page.goto("/demandes");
  await page.getByRole("button", { name: "Voir la demande de Fatoumata Bah" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Marquer comme prioritaire" }).click();
  await expect(dialog.getByRole("button", { name: "Retirer la priorité" })).toBeVisible();
  await expect(dialog).toContainText("Prioritaire");
});
