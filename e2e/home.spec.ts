import { expect, test } from "@playwright/test";

test("la page d'accueil présente l'application en français", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Certipilot");
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});
