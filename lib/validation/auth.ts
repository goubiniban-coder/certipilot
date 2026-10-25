import { z } from "zod";

const email = z
  .string({ error: "Adresse e-mail obligatoire" })
  .trim()
  .toLowerCase()
  .email("Adresse e-mail invalide");

const password = z
  .string({ error: "Mot de passe obligatoire" })
  .min(10, "Le mot de passe doit contenir au moins 10 caractères");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Mot de passe obligatoire"),
});

export const siretSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{14}$/, "Le SIRET doit contenir 14 chiffres"));

export const organizationSchema = z.object({
  organizationName: z.string().trim().min(2, "Nom de l'organisme obligatoire"),
  siret: siretSchema,
  certificatePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, "Le préfixe doit contenir 2 à 10 lettres ou chiffres, sans espace"),
});

export const signUpSchema = organizationSchema.extend({
  fullName: z.string().trim().min(2, "Nom et prénom obligatoires"),
  email,
  password,
});

export const invitationSchema = z.object({
  email,
  fullName: z.string().trim().min(2, "Nom et prénom obligatoires"),
  role: z.enum(["admin", "secretariat", "tester"], { error: "Rôle invalide" }),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(20),
  password,
});

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2, "Nom de l'organisme obligatoire"),
  certificatePrefix: organizationSchema.shape.certificatePrefix,
  retentionMonths: z.coerce
    .number({ error: "Durée invalide" })
    .int("Durée invalide")
    .min(12, "Au moins 12 mois")
    .max(600, "Au plus 600 mois"),
});

export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Compliance problems found by lib/rules, shown as a list. */
  violations?: { code: string; severity: "blocking" | "warning"; message: string }[];
};

/** Flattens Zod errors for display under each field. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}
