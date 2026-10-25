import { describe, expect, it } from "vitest";
import { fieldErrors, signUpSchema } from "@/lib/validation/auth";

const valid = {
  organizationName: "OTC du Nord",
  siret: "123 456 789 00012",
  certificatePrefix: "otc59",
  fullName: "Claire Responsable",
  email: "Claire@Example.test ",
  password: "mot-de-passe-solide",
};

describe("signUpSchema", () => {
  it("normalise le SIRET, le préfixe et l'e-mail", () => {
    const parsed = signUpSchema.parse(valid);
    expect(parsed.siret).toBe("12345678900012");
    expect(parsed.certificatePrefix).toBe("OTC59");
    expect(parsed.email).toBe("claire@example.test");
  });

  it("renvoie des messages en français par champ", () => {
    const result = signUpSchema.safeParse({ ...valid, siret: "123", password: "court" });
    expect(result.success).toBe(false);
    const errors = fieldErrors(result.error!);
    expect(errors.siret).toEqual(["Le SIRET doit contenir 14 chiffres"]);
    expect(errors.password).toEqual(["Le mot de passe doit contenir au moins 10 caractères"]);
  });
});
