import { describe, expect, it } from "vitest";
import {
  checkTesterAssignment,
  checkTrainerConflict,
  normalizeSiret,
  type AssignmentContext,
  type TesterProfile,
} from "@/lib/rules/tester";

const OWN_SIRET = "123 456 789 00012";
const OTHER_SIRET = "98765432100019";

const tester: TesterProfile = {
  id: "t1",
  fullName: "Jean Dupont",
  qualifications: [{ categoryId: "r489-3", active: true }],
  personalCaces: [{ categoryId: "r489-3", issuerSiret: OTHER_SIRET, expiresOn: "2028-01-01" }],
};

function context(overrides: Partial<AssignmentContext> = {}): AssignmentContext {
  return {
    tester,
    candidate: { fullName: "Marie Martin" },
    categoryId: "r489-3",
    categoryLabel: "R.489 cat. 3",
    testDate: "2026-11-02",
    organizationSiret: OWN_SIRET,
    ...overrides,
  };
}

const codes = (ctx: AssignmentContext) => checkTesterAssignment(ctx).map((v) => v.code);

describe("checkTrainerConflict", () => {
  it("bloque si le testeur a formé le candidat", () => {
    const [violation] = checkTrainerConflict(tester, {
      fullName: "Marie Martin",
      trainerTesterId: "t1",
    });
    expect(violation?.severity).toBe("blocking");
    expect(violation?.message).toBe(
      "Jean Dupont a formé Marie Martin : un testeur ne peut pas évaluer un candidat qu'il a formé. Affectez un autre testeur.",
    );
  });

  it("avertit si le nom libre du formateur correspond au testeur", () => {
    const [violation] = checkTrainerConflict(tester, {
      fullName: "Marie Martin",
      trainerName: "DUPONT Jéan",
    });
    expect(violation?.code).toBe("TRAINER_NAME_MATCH");
    expect(violation?.severity).toBe("warning");
  });

  it("ne signale rien quand le formateur est un autre", () => {
    expect(
      checkTrainerConflict(tester, { fullName: "M", trainerTesterId: "t2", trainerName: "Jean Dupont" }),
    ).toEqual([]);
    expect(checkTrainerConflict(tester, { fullName: "M", trainerName: "Paul Durand" })).toEqual([]);
    expect(checkTrainerConflict(tester, { fullName: "M", trainerTesterId: null })).toEqual([]);
  });
});

describe("checkTesterAssignment", () => {
  it("accepte un testeur habilité avec un CACES® valide d'un autre OTC", () => {
    expect(checkTesterAssignment(context())).toEqual([]);
  });

  it("bloque un testeur non habilité ou dont l'habilitation est inactive", () => {
    expect(codes(context({ categoryId: "r489-5", categoryLabel: "R.489 cat. 5" }))).toEqual([
      "TESTER_NOT_QUALIFIED",
      "TESTER_CACES_MISSING",
    ]);
    expect(
      codes(
        context({
          tester: { ...tester, qualifications: [{ categoryId: "r489-3", active: false }] },
        }),
      ),
    ).toEqual(["TESTER_NOT_QUALIFIED"]);
  });

  it("bloque un CACES® délivré par l'organisme lui-même", () => {
    const sameOtc = {
      ...tester,
      personalCaces: [{ categoryId: "r489-3", issuerSiret: "12345678900012", expiresOn: "2028-01-01" }],
    };
    expect(codes(context({ tester: sameOtc }))).toEqual(["TESTER_CACES_SAME_OTC"]);
  });

  it("bloque un CACES® expiré à la date du test, mais l'accepte le jour de l'échéance", () => {
    expect(codes(context({ testDate: "2028-01-02" }))).toEqual(["TESTER_CACES_EXPIRED"]);
    expect(codes(context({ testDate: "2028-01-01" }))).toEqual([]);
  });

  it("cumule le conflit formateur et les autres contrôles", () => {
    expect(
      codes(context({ candidate: { fullName: "Marie Martin", trainerTesterId: "t1" } })),
    ).toEqual(["TRAINER_CONFLICT"]);
  });

  it("normalise les SIRET", () => {
    expect(normalizeSiret(" 123 456 789 00012 ")).toBe("12345678900012");
  });
});
