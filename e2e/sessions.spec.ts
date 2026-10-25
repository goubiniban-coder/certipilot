import { expect, test } from "@playwright/test";
import path from "node:path";
import { signIn } from "./helpers";

test("préparer une session avec tous les contrôles de conformité", async ({ page }) => {
  const id = Date.now().toString().slice(-6);
  await signIn(page, "admin@demo.certipilot.test");
  await page.getByRole("link", { name: "Sessions" }).click();

  const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Nom de la session").fill(`Session E2E ${id}`);
  await page.getByLabel("Date de début").fill(inAWeek);
  await page.getByLabel("Date de fin").fill(inAWeek);
  await page.getByLabel("Lieu").fill("Lille");
  await page.getByRole("button", { name: "Créer la session" }).click();
  await expect(page.getByRole("heading", { name: `Session E2E ${id}` })).toBeVisible();

  // Testers and equipment.
  for (const tester of ["Marc Testeur", "Julie Testeuse"]) {
    await page.getByLabel("Testeur", { exact: true }).first().selectOption({ label: tester });
    await page.getByRole("button", { name: "Affecter" }).first().click();
    await expect(page.getByRole("button", { name: `Retirer ${tester}` })).toBeVisible();
  }
  await page.getByLabel("Engin", { exact: true }).first().selectOption({ label: "Chariot frontal 1,8 t (n° CF-0003)" });
  await page.getByRole("button", { name: "Affecter" }).nth(1).click();
  await expect(page.getByText(/date de plus d'un an à la date du test/)).toBeVisible();
  await page.getByLabel("Engin", { exact: true }).first().selectOption({ label: "Chariot frontal 2,5 t (n° CF-0001)" });
  await page.getByRole("button", { name: "Affecter" }).nth(1).click();
  await expect(page.getByRole("button", { name: "Retirer Chariot frontal 2,5 t" })).toBeVisible();

  // Candidates.
  for (const label of [/^BERNARD Paul/, /^MARTIN Lucas/]) {
    await page.getByLabel("Candidat existant").selectOption({ label: await page.getByLabel("Candidat existant").locator("option", { hasText: label }).first().innerText() });
    await page.getByRole("button", { name: "Inscrire" }).click();
  }
  const paul = page.getByRole("region", { name: "Paul Bernard" });
  await expect(paul).toBeVisible();

  // Marc trained Paul: blocked with a clear explanation.
  await paul.getByText("Planifier une épreuve pratique").click();
  await paul.getByLabel("Catégorie").selectOption({ label: "R.489 cat. 3" });
  await paul.getByLabel("Testeur").selectOption({ label: "Marc Testeur" });
  await paul.getByLabel("Engin").selectOption({ label: "Chariot frontal 2,5 t (n° CF-0001)" });
  await paul.getByRole("button", { name: "Planifier l'épreuve pratique" }).click();
  await expect(paul.getByText("Marc Testeur a formé Paul Bernard : un testeur ne peut pas évaluer un candidat qu'il a formé. Affectez un autre testeur.")).toBeVisible();

  // Julie is qualified and holds a valid CACES® from another OTC.
  await paul.getByLabel("Testeur").selectOption({ label: "Julie Testeuse" });
  await paul.getByRole("button", { name: "Planifier l'épreuve pratique" }).click();
  await expect(paul.getByText("Épreuve pratique planifiée.")).toBeVisible();
  await expect(paul.getByText("À passer")).toBeVisible();

  // Theory result, checked against the referential pass mark.
  const lucas = page.getByRole("region", { name: "Lucas Martin" });
  await lucas.getByText("Saisir un résultat de théorie").click();
  await lucas.getByLabel("Recommandation").selectOption({ label: "R.489 · Chariots de manutention automoteurs à conducteur porté" });
  await lucas.getByLabel("Score").fill("30");
  await lucas.getByRole("button", { name: "Enregistrer" }).click();
  await expect(lucas.getByText("Résultat enregistré : théorie réussie.")).toBeVisible();

  // CSV import straight into the session.
  await page.getByLabel("Fichier CSV").setInputFiles(path.join(__dirname, "fixtures/candidats.csv"));
  await page.getByRole("button", { name: "Importer" }).click();
  await expect(page.getByText(/Import terminé : \d candidat\(s\) créé\(s\).*2 ajouté\(s\) à la session/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Inès Roux" })).toBeVisible();
});
