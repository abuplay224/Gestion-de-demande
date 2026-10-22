import { expect, test } from "@playwright/test";
import { countRows, resetDb } from "./db";

test.beforeEach(async () => {
  await resetDb();
});

test("parcours complet : liste → formulaire → enregistrement → liste → actualisation (R01, R06)", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/demandes$/);
  await expect(page.getByText("26 demandes · 3 prioritaires")).toBeVisible();

  await page.getByRole("link", { name: "Ajouter une demande" }).click();
  await expect(page).toHaveURL(/\/demandes\/nouvelle$/);
  await expect(page.getByRole("heading", { name: "Nouvelle demande" })).toBeVisible();
  await expect(page.getByLabel(/Nom du client/)).toBeFocused();

  await page.getByLabel(/Nom du client/).fill("Clinique Ambroise Paré");
  await page.getByLabel(/Téléphone/).fill("+224 0628 11 22 33");
  await page.getByLabel(/Objet/).fill("Imprimante de l’accueil en panne");
  const description = "L’imprimante de l’accueil n’imprime plus les reçus depuis ce matin.";
  await page.getByLabel(/Description/).fill(description);
  await expect(page.getByText(new RegExp(`^${description.length} / 5\\s000$`))).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByText("Demande enregistrée")).toBeVisible();
  await expect(page).toHaveURL(/\/demandes$/);
  await expect(page.getByText("27 demandes · 3 prioritaires")).toBeVisible();
  // Plus récente des demandes normales : juste après les 3 prioritaires
  const rows = page.getByRole("row");
  await expect(rows.nth(4)).toContainText("Clinique Ambroise Paré");
  await expect(rows.nth(4)).toContainText("Normale");

  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: "Clinique Ambroise Paré" })).toBeVisible();
  expect(await countRows("customer_phone = $1", ["+224 0628 11 22 33"])).toBe(1);
});

test("R02 — erreurs par champ, focus sur le premier champ fautif, rien d’enregistré", async ({ page }) => {
  await page.goto("/demandes/nouvelle");
  await page.getByLabel(/E-mail/).fill("nom@entreprise");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  const name = page.getByLabel(/Nom du client/);
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription("Indiquez le nom du client ou de l’entreprise.");
  await expect(page.getByText("Adresse e-mail invalide. Exemple : nom@entreprise.com")).toBeVisible();
  await expect(page.getByText("Indiquez l’objet de la demande.")).toBeVisible();
  await expect(page.getByText("Décrivez la demande du client.")).toBeVisible();

  // L’erreur disparaît dès que le champ devient valide
  await name.fill("Hôtel Kaloum");
  await expect(page.getByText("Indiquez le nom du client ou de l’entreprise.")).toBeHidden();
  expect(await countRows()).toBe(26);
});

test("R05 — un double clic sur Enregistrer ne crée qu’une demande", async ({ page }) => {
  await page.goto("/demandes/nouvelle");
  await page.getByLabel(/Nom du client/).fill("Double Clic SARL");
  await page.getByLabel(/Objet/).fill("Envoi répété");
  await page.getByLabel(/Description/).fill("Vérifie qu’un double clic ne crée pas de doublon.");
  await page.getByRole("button", { name: "Enregistrer" }).dblclick();

  await expect(page.getByText("Demande enregistrée")).toBeVisible();
  expect(await countRows("customer_name = $1", ["Double Clic SARL"])).toBe(1);
});

test("Annuler revient à la liste sans rien enregistrer", async ({ page }) => {
  await page.goto("/demandes/nouvelle");
  await page.getByLabel(/Nom du client/).fill("Ne pas enregistrer");
  await page.getByRole("link", { name: "Annuler" }).click();
  await expect(page).toHaveURL(/\/demandes$/);
  expect(await countRows()).toBe(26);
});
