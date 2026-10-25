import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("tableau de bord : sessions, certificats et renouvellements par entreprise", async ({ page }) => {
  await signIn(page, "admin@demo.certipilot.test");
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Certificats délivrés" }).getByText("Certificats en cours de validité")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prochaines sessions" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Session (du jour \(démo\)|chariots R\.489)$/ }).first()).toBeVisible();

  // Seed history: Lucas (Logistique du Nord) expires in 40 days, Emma (BTP Services)
  // in 120 days; Paul's certificate is beyond the 6-month horizon.
  const renewals = page.getByRole("heading", { name: "Renouvellements à prévoir" }).locator("xpath=ancestor::*[@data-slot='card'][1]");
  await expect(renewals.getByRole("region", { name: "Logistique du Nord" }).getByRole("link", { name: "MARTIN Lucas" })).toBeVisible();
  await expect(renewals.getByRole("region", { name: "BTP Services" }).getByRole("link", { name: "PETIT Emma" })).toBeVisible();
  await expect(renewals.getByText("BERNARD Paul")).toHaveCount(0);
});
