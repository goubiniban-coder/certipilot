import { describe, expect, it } from "vitest";
import { parseCandidatesCsv, parseFrenchDate, splitCsvLine } from "@/lib/csv/candidates";

describe("parseCandidatesCsv", () => {
  it("lit un export de tableur français (point-virgule, dates JJ/MM/AAAA, BOM)", () => {
    const csv = "﻿Nom;Prénom;Date de naissance;Entreprise;Formateur\r\nMartin;Lucas;12/04/1995;Logistique du Nord;\r\nPetit;Emma;2000-07-21;;Jean Formateur\r\n";
    const result = parseCandidatesCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { line: 2, lastName: "Martin", firstName: "Lucas", birthDate: "1995-04-12", company: "Logistique du Nord", email: null, trainerName: null },
      { line: 3, lastName: "Petit", firstName: "Emma", birthDate: "2000-07-21", company: null, email: null, trainerName: "Jean Formateur" },
    ]);
  });

  it("accepte la virgule, les guillemets et un ordre de colonnes quelconque", () => {
    const csv = 'email,prenom,nom,date_naissance\n"a@b.test","Jean-Marie","Dupont, fils",1/2/1990';
    expect(parseCandidatesCsv(csv).rows[0]).toMatchObject({
      lastName: "Dupont, fils",
      firstName: "Jean-Marie",
      birthDate: "1990-02-01",
      email: "a@b.test",
    });
  });

  it("signale les lignes invalides sans bloquer les autres", () => {
    const csv = "nom;prenom;naissance\nMartin;;01/01/1990\nDurand;Léa;31/02/1990\nPetit;Emma;01/01/2001";
    const result = parseCandidatesCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.errors.map((e) => e.message)).toEqual([
      "Ligne 2 : nom et prénom obligatoires.",
      "Ligne 3 : date de naissance invalide (« 31/02/1990 »).",
    ]);
  });

  it("refuse un fichier vide ou sans les colonnes obligatoires", () => {
    expect(parseCandidatesCsv("\n\n").errors[0]?.message).toBe("Le fichier est vide.");
    expect(parseCandidatesCsv("nom;entreprise\nX;Y").errors[0]?.message).toContain("Colonnes obligatoires manquantes");
  });
});

describe("helpers CSV", () => {
  it("gère les guillemets échappés", () => {
    expect(splitCsvLine('"Il dit ""bonjour""";b', ";")).toEqual(['Il dit "bonjour"', "b"]);
  });

  it("convertit les dates françaises", () => {
    expect(parseFrenchDate("05.03.1980")).toBe("1980-03-05");
    expect(parseFrenchDate("1980-03-05")).toBe("1980-03-05");
    expect(parseFrenchDate("hier")).toBeNull();
  });
});
