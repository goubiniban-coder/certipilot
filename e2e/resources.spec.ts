import { expect, test } from "@playwright/test";
import { signIn, signUpOrganization } from "./helpers";

test("les alertes du centre de démo signalent le CACES® et l'engin à surveiller", async ({ page }) => {
  await signIn(page, "admin@demo.certipilot.test");
  const alerts = page.getByRole("heading", { name: "Alertes de conformité" }).locator("..").locator("..");
  await expect(alerts.getByText("CACES® de Julie Testeuse")).toBeVisible();
  await expect(alerts.getByText("Expire dans 45 jours")).toBeVisible();
  await expect(alerts.getByText("Vérification de Chariot frontal 1,8 t")).toBeVisible();
});

test("fiche testeur : habilitation, CACES® d'un autre OTC et alerte d'échéance", async ({ page }) => {
  await signUpOrganization(page);
  await page.getByRole("link", { name: "Testeurs" }).click();
  await page.getByLabel("Nom et prénom").fill("Hugo Testeur");
  await page.getByRole("button", { name: "Créer la fiche" }).click();
  await expect(page.getByRole("heading", { name: "Hugo Testeur" })).toBeVisible();

  await page.locator("#qualification-category").selectOption({ label: "R.489 cat. 3 · Chariots élévateurs en porte-à-faux (capacité ≤ 6 t)" });
  await page.getByRole("button", { name: "Habiliter" }).click();
  await expect(page.getByText("Habilitation enregistrée.")).toBeVisible();

  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  await page.locator("#caces-category").selectOption({ label: "R.489 cat. 3 · Chariots élévateurs en porte-à-faux (capacité ≤ 6 t)" });
  await page.getByLabel("Numéro du CACES®").fill("EXT-42");
  await page.getByLabel("Organisme émetteur", { exact: true }).fill("Autre OTC");
  await page.getByLabel("SIRET de l'organisme émetteur").fill("98765432100019");
  await page.getByLabel("Date d'échéance").fill(soon);
  await page.getByRole("button", { name: "Ajouter le CACES®" }).click();
  await expect(page.getByText("CACES® personnel enregistré.")).toBeVisible();
  await expect(page.getByText(/Expire dans (29|30) jours/)).toBeVisible();

  await page.getByRole("link", { name: "Tableau de bord" }).click();
  await expect(page.getByText("CACES® de Hugo Testeur")).toBeVisible();
});

test("un engin sans vérification récente est signalé", async ({ page }) => {
  await signUpOrganization(page);
  await page.getByRole("link", { name: "Engins" }).click();
  await page.getByLabel("Désignation").fill("Nacelle ciseaux");
  await page.getByLabel("Numéro de série").fill("NC-77");
  await page.getByLabel("Catégorie").selectOption({ label: "R.486 cat. A · PEMP à élévation verticale" });
  const old = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Dernière vérification périodique").fill(old);
  await page.getByRole("button", { name: "Ajouter l'engin" }).click();
  await expect(page.getByText("Vérification de plus d'un an")).toBeVisible();
});
