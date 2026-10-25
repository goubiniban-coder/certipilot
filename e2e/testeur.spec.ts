import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

/** Back office: a session today with Marc, CF-0001 and two new candidates assigned to him. */
async function prepareTodaySession(page: Page, id: string) {
  await signIn(page, "admin@demo.certipilot.test");
  await page.getByRole("link", { name: "Sessions" }).click();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  await page.getByLabel("Nom de la session").fill(`Terrain ${id}`);
  await page.getByLabel("Date de début").fill(today);
  await page.getByLabel("Date de fin").fill(today);
  await page.getByLabel("Lieu").fill("Lille");
  await page.getByRole("button", { name: "Créer la session" }).click();
  await expect(page.getByRole("heading", { name: `Terrain ${id}` })).toBeVisible();

  await page.getByLabel("Testeur", { exact: true }).first().selectOption({ label: "Marc Testeur" });
  await page.getByRole("button", { name: "Affecter" }).first().click();
  await expect(page.getByRole("button", { name: "Retirer Marc Testeur" })).toBeVisible();
  await page.getByLabel("Engin", { exact: true }).first().selectOption({ label: "Chariot frontal 2,5 t (n° CF-0001)" });
  await page.getByRole("button", { name: "Affecter" }).nth(1).click();
  await expect(page.getByRole("button", { name: "Retirer Chariot frontal 2,5 t" })).toBeVisible();

  const csv = `Nom;Prénom;Date de naissance;Entreprise\nReussite${id};Alex;01/02/1990;Logistique du Nord\nFaute${id};Sam;03/04/1992;Logistique du Nord\n`;
  await page.getByLabel("Fichier CSV").setInputFiles({ name: "candidats.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Importer" }).click();
  await expect(page.getByText(/2 ajouté\(s\) à la session/)).toBeVisible();

  for (const name of [`Alex Reussite${id}`, `Sam Faute${id}`]) {
    const region = page.getByRole("region", { name });
    await region.getByText("Planifier une épreuve pratique").click();
    await region.getByLabel("Catégorie").selectOption({ label: "R.489 cat. 3" });
    await region.getByLabel("Testeur").selectOption({ label: "Marc Testeur" });
    await region.getByLabel("Engin").selectOption({ label: "Chariot frontal 2,5 t (n° CF-0001)" });
    await region.getByRole("button", { name: "Planifier l'épreuve pratique" }).click();
    await expect(region.getByText("Épreuve pratique planifiée.")).toBeVisible();
  }
  return page.url();
}

async function checkIdentityAndStart(page: Page) {
  await page.getByRole("button", { name: "Valider l'identité" }).click();
  await expect(page.getByText(/n'a pas été contrôlée/)).toBeVisible();
  await page.getByLabel("Type de pièce").selectOption({ label: "Carte nationale d'identité" });
  await page.getByLabel("Numéro de la pièce").fill("X1234567");
  await page.getByLabel("Identité vérifiée").check();
  await page.getByRole("button", { name: "Valider l'identité" }).click();
  await page.getByRole("button", { name: "Démarrer l'épreuve" }).click();
  await expect(page.getByLabel("Chronomètre")).toBeVisible();
}

test("le testeur fait passer une épreuve hors connexion puis synchronise", async ({ page, browser }) => {
  test.setTimeout(120_000);
  // Letters only: candidate names are compared without digits.
  const id = Date.now().toString().slice(-6).replace(/\d/g, (d) => "abcdefghij"[Number(d)]!);
  const sessionUrl = await prepareTodaySession(page, id);

  const context = await browser.newContext({ ...test.info().project.use });
  const tablet = await context.newPage();
  await signIn(tablet, "testeur1@demo.certipilot.test");
  await expect(tablet).toHaveURL(/\/testeur$/);
  await expect(tablet.getByRole("heading", { name: "Candidats du jour" })).toBeVisible();
  await expect(tablet.getByRole("button", { name: new RegExp(`Alex Reussite${id}`) })).toBeVisible();
  await expect(tablet.getByRole("status")).toHaveText(/Synchronisé/);

  // The rest of the test runs without network.
  await context.setOffline(true);
  await expect(tablet.getByRole("status")).toHaveText(/Hors ligne/);

  await tablet.getByRole("button", { name: new RegExp(`Alex Reussite${id}`) }).click();
  await checkIdentityAndStart(tablet);

  const finish = tablet.getByRole("button", { name: "Terminer l'épreuve" });
  await expect(finish).toBeDisabled();
  const criteria = tablet.getByRole("listitem").filter({ has: tablet.locator("p.text-lg") });
  const count = await criteria.count();
  for (let i = 0; i < count; i += 1) {
    const row = criteria.nth(i);
    if (await row.getByRole("button", { name: "Satisfait" }).count()) {
      await row.getByRole("button", { name: "Satisfait" }).click();
    } else if (i === 0) {
      await row.getByRole("textbox").fill("5");
    } else {
      await row.getByRole("button", { name: "Maximum" }).click();
    }
  }
  const score = tablet.getByLabel("Score en direct");
  await expect(score).toContainText("95/100");
  await expect(score).toContainText("Réussi");

  await finish.click();
  await expect(tablet.getByText("Épreuve réussie · 95/100")).toBeVisible();
  await tablet.getByRole("button", { name: "Signer et clôturer" }).click();
  await expect(tablet.getByText("Votre signature est obligatoire")).toBeVisible();
  const pad = await tablet.getByRole("img", { name: "Signature du testeur" }).boundingBox();
  await tablet.mouse.move(pad!.x + 30, pad!.y + 40);
  await tablet.mouse.down();
  await tablet.mouse.move(pad!.x + 150, pad!.y + 120, { steps: 10 });
  await tablet.mouse.move(pad!.x + 260, pad!.y + 50, { steps: 10 });
  await tablet.mouse.up();
  await tablet.getByRole("button", { name: "Signer et clôturer" }).click();
  await expect(tablet.getByText("En attente d'envoi")).toBeVisible();
  await expect(tablet.getByRole("status")).toHaveText(/Hors ligne\s*· 3 modifications en attente/);

  // Still offline: the app page and the local data survive a reload.
  // (The service worker only runs on production builds: `pnpm build && pnpm start`.)
  if (await tablet.evaluate(() => Boolean(navigator.serviceWorker?.controller))) {
    await tablet.reload();
  }
  await expect(tablet.getByRole("button", { name: new RegExp(`Alex Reussite${id}.*Réussi · à envoyer`) })).toBeVisible();

  // An eliminatory fault fails the test at once, whatever the other marks.
  await tablet.getByRole("button", { name: new RegExp(`Sam Faute${id}`) }).click();
  await checkIdentityAndStart(tablet);
  await tablet.getByRole("button", { name: "Faute éliminatoire" }).first().click();
  await expect(tablet.getByLabel("Score en direct")).toContainText("Échoué");
  await expect(tablet.getByRole("button", { name: "Terminer l'épreuve" })).toBeEnabled();
  await tablet.getByRole("button", { name: "Candidats du jour" }).click();

  // Back online: the queue is sent and the server recomputes the result.
  await context.setOffline(false);
  await expect(tablet.getByRole("status")).toHaveText("Synchronisé", { timeout: 30_000 });
  await context.close();

  await page.goto(sessionUrl);
  const alex = page.getByRole("region", { name: `Alex Reussite${id}` });
  await expect(alex.getByText("Identité contrôlée")).toBeVisible();
  await expect(alex.getByText("Réussi · 95/100")).toBeVisible();
  await expect(page.getByRole("region", { name: `Sam Faute${id}` }).getByText("Identité contrôlée")).toBeVisible();
});
