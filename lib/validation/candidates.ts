import { z } from "zod";
import { isIsoDate } from "@/lib/rules/dates";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null);

const optionalUuid = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.string().uuid().nullable());

export const clientCompanySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Raison sociale obligatoire"),
  siret: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\s+/g, "") : null))
    .refine((v) => v === null || /^\d{14}$/.test(v), "Le SIRET doit contenir 14 chiffres"),
  contactName: optionalText,
  contactEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .pipe(z.string().email("Adresse e-mail invalide").nullable()),
  contactPhone: optionalText,
});

export const candidateSchema = z.object({
  id: z.string().uuid().optional(),
  lastName: z.string().trim().min(1, "Nom obligatoire"),
  firstName: z.string().trim().min(1, "Prénom obligatoire"),
  birthDate: z
    .string({ error: "Date de naissance obligatoire" })
    .refine(isIsoDate, "Date de naissance invalide"),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .pipe(z.string().email("Adresse e-mail invalide").nullable()),
  clientCompanyId: optionalUuid,
  trainerTesterId: optionalUuid,
  trainerName: optionalText,
});

export const sessionSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Nom de la session obligatoire"),
    startsOn: z.string().refine(isIsoDate, "Date de début invalide"),
    endsOn: z.string().refine(isIsoDate, "Date de fin invalide"),
    location: z.string().trim().min(2, "Lieu obligatoire"),
    status: z.enum(["draft", "planned", "in_progress", "closed"]).default("draft"),
    notes: optionalText,
  })
  .refine((s) => s.endsOn >= s.startsOn, {
    message: "La date de fin doit suivre la date de début",
    path: ["endsOn"],
  });

export const practicalAssignmentSchema = z.object({
  sessionId: z.string().uuid(),
  sessionCandidateId: z.string().uuid(),
  categoryId: z.string({ error: "Catégorie obligatoire" }).uuid("Catégorie obligatoire"),
  testerId: z.string({ error: "Testeur obligatoire" }).uuid("Testeur obligatoire"),
  equipmentId: z.string({ error: "Engin obligatoire" }).uuid("Engin obligatoire"),
  testDate: z.string().refine(isIsoDate, "Date du test invalide"),
  confirmWarnings: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export const theoryResultSchema = z
  .object({
    sessionId: z.string().uuid(),
    sessionCandidateId: z.string().uuid(),
    recommendationId: z.string({ error: "Recommandation obligatoire" }).uuid("Recommandation obligatoire"),
    kind: z.enum(["qcm", "qcm_ipr"]),
    score: z.coerce.number({ error: "Score invalide" }).min(0, "Score invalide"),
    maxScore: z.coerce.number({ error: "Score maximal invalide" }).positive("Score maximal invalide"),
    takenOn: z.string().refine(isIsoDate, "Date invalide"),
  })
  .refine((t) => t.score <= t.maxScore, { message: "Le score dépasse le maximum", path: ["score"] });
