import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "certipilot-demo";

export async function signIn(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

/** Signs up a brand-new OTC (isolated data) and lands on its back office. */
export async function signUpOrganization(page: Page) {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
  const name = `OTC E2E ${id}`;
  await page.goto("/inscription");
  await page.getByLabel("Nom de l'organisme").fill(name);
  await page.getByLabel("SIRET").fill(`77${id}`.padEnd(14, "0"));
  await page.getByLabel("Préfixe des numéros de certificat").fill(`E${id.slice(-5)}`);
  await page.getByLabel("Nom et prénom").fill("Alice Responsable");
  await page.getByLabel("Adresse e-mail").fill(`admin-${id}@e2e.certipilot.test`);
  await page.getByLabel("Mot de passe").fill("mot-de-passe-solide");
  await page.getByRole("button", { name: "Créer l'espace de mon organisme" }).click();
  await expect(page).toHaveURL(/\/app$/);
  return { id, name };
}
