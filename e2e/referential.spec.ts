import { expect, test } from "@playwright/test";
import { signIn, signUpOrganization } from "./helpers";

test("le responsable adapte une durée de validité et une grille", async ({ page }) => {
  await signUpOrganization(page);
  await page.getByRole("link", { name: "Référentiel" }).click();
  await expect(page.getByRole("row")).toHaveCount(9);
  await expect(page.getByRole("row", { name: /R\.482/ })).toContainText("10 ans");

  await page.getByRole("link", { name: "R.489" }).click();
  await page.getByLabel("Durée de validité (années)").fill("6");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).first().click();
  await expect(page.getByText("Recommandation enregistrée.")).toBeVisible();

  await page.getByRole("link", { name: /Grille pratique/ }).click();
  await expect(page.getByText("Grille d'exemple, non officielle")).toBeVisible();
  await expect(page.getByText("Total : 100 points")).toBeVisible();
  await page.getByRole("button", { name: "Ajouter un critère" }).click();
  await page.getByLabel("Libellé").last().fill("Respect du plan de circulation");
  await page.getByLabel("Points max").last().fill("5");
  await expect(page.getByText("Total : 105 points")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer la grille" }).click();
  await expect(page.getByText("Grille enregistrée.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Libellé").last()).toHaveValue("Respect du plan de circulation");
});

test("le secrétariat consulte le référentiel sans pouvoir le modifier", async ({ page }) => {
  await signIn(page, "secretariat@demo.certipilot.test");
  await page.getByRole("link", { name: "Référentiel" }).click();
  await page.getByRole("link", { name: "R.486" }).click();
  await expect(page.getByLabel("Durée de validité (années)")).toBeDisabled();
  await page.getByRole("link", { name: /Grille pratique/ }).click();
  await expect(page.getByRole("button", { name: "Enregistrer la grille" })).toHaveCount(0);
});
