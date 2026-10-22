import { type Browser, expect, type Page, test } from "@playwright/test";
import { resetDb } from "./db";
import { E2E_ADMIN, E2E_AGENT, PASSWORD, STATE } from "./users";

const ANONYMOUS = { cookies: [], origins: [] };

async function login(page: Page, email: string, password: string) {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function freshPage(browser: Browser) {
  return (await browser.newContext({ storageState: ANONYMOUS })).newPage();
}

test.beforeEach(async () => {
  await resetDb();
});

test.describe("visiteur sans session (R15)", () => {
  test.use({ storageState: ANONYMOUS });

  test("toutes les pages renvoient vers la connexion, puis vers la page demandée", async ({ page }) => {
    for (const path of ["/demandes", "/demandes/nouvelle", "/admin/utilisateurs"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/connexion/);
      await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
    }
    await expect(page.getByText("26 demandes")).toBeHidden(); // aucune donnée affichée

    await page.goto("/demandes/nouvelle");
    await page.getByLabel("E-mail").fill(E2E_AGENT.email);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/demandes\/nouvelle$/);
  });

  test("identifiants incorrects : message générique, e-mail conservé", async ({ page }) => {
    await login(page, E2E_AGENT.email, "mauvais-mot-de-passe");
    await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue(E2E_AGENT.email);

    await login(page, "inconnu@doztra.test", PASSWORD);
    await expect(page.getByText("E-mail ou mot de passe incorrect.")).toBeVisible();
  });

  test("il n’existe aucune page d’inscription", async ({ page }) => {
    await page.goto("/connexion");
    await expect(page.getByRole("link", { name: /inscri|créer un compte/i })).toHaveCount(0);
    const res = await page.goto("/inscription");
    expect(res?.url()).toMatch(/\/connexion/); // protégée, puis inexistante
  });
});

test("agent : accès aux demandes, pas à l’administration ; déconnexion", async ({ browser }) => {
  // Session dédiée : la déconnexion ne doit pas révoquer la session partagée des autres parcours
  const page = await freshPage(browser);
  await login(page, E2E_AGENT.email, PASSWORD);
  await expect(page).toHaveURL(/\/demandes$/);
  await expect(page.getByText(E2E_AGENT.name)).toBeVisible();
  await expect(page.getByRole("link", { name: "Utilisateurs" })).toHaveCount(0);

  await page.goto("/admin/utilisateurs");
  await expect(page).toHaveURL(/\/demandes$/);

  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await page.goto("/demandes");
  await expect(page).toHaveURL(/\/connexion/);
});

test.describe("administrateur", () => {
  test.use({ storageState: STATE.admin });

  test("crée un compte agent, qui peut se connecter ; le désactive, qui est déconnecté", async ({ page, browser }) => {
    await page.goto("/demandes");
    await page.getByRole("link", { name: "Utilisateurs" }).click();
    await expect(page.getByRole("heading", { name: "Utilisateurs" })).toBeVisible();
    await expect(page.getByRole("listitem", { name: E2E_ADMIN.name })).toContainText("(vous)");

    await page.getByLabel("Nom complet *").fill("Mamadou Diallo");
    await page.getByLabel("E-mail *").fill("Mamadou.Diallo@doztra.test");
    await page.getByLabel(/Mot de passe provisoire/).fill("provisoire-2026");
    await page.getByRole("button", { name: "Créer le compte" }).click();
    await expect(page.getByText("Compte créé pour mamadou.diallo@doztra.test")).toBeVisible();
    const row = page.getByRole("listitem", { name: "Mamadou Diallo" });
    await expect(row).toContainText("Agent");
    await expect(row).toContainText("Actif");

    // Même e-mail : refusé au bon champ
    await page.getByLabel("Nom complet *").fill("Doublon");
    await page.getByLabel("E-mail *").fill("mamadou.diallo@doztra.test");
    await page.getByLabel(/Mot de passe provisoire/).fill("provisoire-2026");
    await page.getByRole("button", { name: "Créer le compte" }).click();
    await expect(page.getByText("Un compte existe déjà avec cet e-mail.")).toBeVisible();

    // Le nouvel agent se connecte
    const other = await freshPage(browser);
    await login(other, "mamadou.diallo@doztra.test", "provisoire-2026");
    await expect(other).toHaveURL(/\/demandes$/);

    // Désactivation : sa session tombe et il ne peut plus se reconnecter
    await row.getByRole("button", { name: "Désactiver" }).click();
    await expect(row).toContainText("Désactivé");
    await other.reload();
    await expect(other).toHaveURL(/\/connexion/);
    await login(other, "mamadou.diallo@doztra.test", "provisoire-2026");
    await expect(other.getByText("Ce compte est désactivé. Contactez un administrateur.")).toBeVisible();

    // Réactivation puis promotion administrateur
    await row.getByRole("button", { name: "Réactiver" }).click();
    await expect(row).toContainText("Actif");
    await row.getByRole("button", { name: "Passer administrateur" }).click();
    await expect(row).toContainText("Administrateur");
    await login(other, "mamadou.diallo@doztra.test", "provisoire-2026");
    await expect(other.getByRole("link", { name: "Utilisateurs" })).toBeVisible();
  });

  test("ne peut ni se rétrograder ni se désactiver lui-même", async ({ page }) => {
    await page.goto("/admin/utilisateurs");
    const me = page.getByRole("listitem", { name: E2E_ADMIN.name });
    await expect(me.getByRole("button")).toHaveCount(0);
  });

  test("valide le formulaire de création", async ({ page }) => {
    await page.goto("/admin/utilisateurs");
    await page.getByRole("button", { name: "Créer le compte" }).click();
    await expect(page.getByLabel("Nom complet *")).toBeFocused();
    await expect(page.getByText("Indiquez le nom de la personne.")).toBeVisible();
    await expect(page.getByText("10 caractères minimum.")).toBeVisible();
  });
});
