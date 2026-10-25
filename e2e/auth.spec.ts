import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD } from "./helpers";

test.describe("authentification et organisation", () => {
  test("le responsable du centre de démo se connecte et voit le back-office", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill("admin@demo.certipilot.test");
    await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await expect(page.getByText("Centre de test Démo")).toBeVisible();
  });

  test("un mauvais mot de passe affiche une erreur en français", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill("admin@demo.certipilot.test");
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Adresse e-mail ou mot de passe incorrect." }),
    ).toBeVisible();
  });

  test("un testeur arrive sur l'application testeur", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill("testeur1@demo.certipilot.test");
    await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/testeur/);
  });

  test("inscription d'un OTC, invitation puis activation d'un compte secrétariat", async ({
    page,
    browser,
  }) => {
    const id = Date.now().toString().slice(-9);
    const siret = `99${id}`.padEnd(14, "0");

    await page.goto("/inscription");
    await page.getByLabel("Nom de l'organisme").fill(`OTC E2E ${id}`);
    await page.getByLabel("SIRET").fill(siret);
    await page.getByLabel("Préfixe des numéros de certificat").fill(`E${id.slice(-5)}`);
    await page.getByLabel("Nom et prénom").fill("Alice Responsable");
    await page.getByLabel("Adresse e-mail").fill(`admin-${id}@e2e.certipilot.test`);
    await page.getByLabel("Mot de passe").fill("mot-de-passe-solide");
    await page.getByRole("button", { name: "Créer l'espace de mon organisme" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText(`OTC E2E ${id}`)).toBeVisible();

    await page.getByRole("link", { name: "Utilisateurs" }).click();
    await page.getByLabel("Nom et prénom").fill("Bruno Secrétariat");
    await page.getByLabel("Adresse e-mail").fill(`secretariat-${id}@e2e.certipilot.test`);
    await page.getByLabel("Rôle").selectOption("secretariat");
    await page.getByRole("button", { name: "Créer l'invitation" }).click();
    await expect(page.getByText("Invitation créée pour Bruno Secrétariat")).toBeVisible();
    const link = await page.getByLabel("Lien d'invitation de Bruno Secrétariat").inputValue();

    const other = await browser.newContext();
    const invitee = await other.newPage();
    await invitee.goto(link);
    await expect(invitee.getByRole("heading", { name: `Rejoindre OTC E2E ${id}` })).toBeVisible();
    await invitee.getByLabel("Mot de passe").fill("autre-mot-de-passe");
    await invitee.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(invitee).toHaveURL(/\/app$/);
    await expect(invitee.getByRole("banner").getByText("Bruno Secrétariat")).toBeVisible();
    // The secretariat does not manage users.
    await expect(invitee.getByRole("link", { name: "Utilisateurs" })).toHaveCount(0);
    await other.close();
  });
});
