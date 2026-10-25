import { describe, expect, it } from "vitest";
import { dbErrorMessage } from "@/lib/db-errors";

describe("dbErrorMessage", () => {
  it("affiche tel quel le message métier de la base", () => {
    expect(
      dbErrorMessage({ code: "P0001", hint: "TRAINER_CONFLICT", message: "Marc a formé Paul : …" }),
    ).toBe("Marc a formé Paul : …");
  });

  it("traduit les erreurs techniques courantes", () => {
    expect(dbErrorMessage({ code: "42501", message: "permission denied" })).toBe(
      "Action non autorisée avec votre rôle.",
    );
    expect(dbErrorMessage({ message: "new row violates row-level security policy" })).toBe(
      "Action non autorisée avec votre rôle.",
    );
    expect(dbErrorMessage({ code: "23505", message: "duplicate key" })).toBe("Cet élément existe déjà.");
  });

  it("ne divulgue jamais un message technique inconnu", () => {
    expect(dbErrorMessage({ code: "XX000", message: "internal stack trace" })).toMatch(
      /^Une erreur inattendue/,
    );
    expect(dbErrorMessage(null)).toMatch(/^Une erreur inattendue/);
  });
});
