import { z } from "zod";
import { isIsoDate } from "@/lib/rules/dates";
import { siretSchema } from "./auth";

const isoDate = (label: string) =>
  z.string({ error: `${label} obligatoire` }).refine(isIsoDate, `${label} invalide`);

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null);

export const testerSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2, "Nom et prénom obligatoires"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => v || null)
    .pipe(z.string().email("Adresse e-mail invalide").nullable()),
  active: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export const qualificationSchema = z.object({
  testerId: z.string().uuid(),
  categoryId: z.string({ error: "Catégorie obligatoire" }).uuid("Catégorie obligatoire"),
  grantedOn: isoDate("Date d'habilitation"),
});

export const personalCacesSchema = z.object({
  testerId: z.string().uuid(),
  categoryId: z.string({ error: "Catégorie obligatoire" }).uuid("Catégorie obligatoire"),
  certificateNumber: z.string().trim().min(1, "Numéro obligatoire"),
  issuerName: z.string().trim().min(2, "Organisme émetteur obligatoire"),
  issuerSiret: siretSchema,
  expiresOn: isoDate("Date d'échéance"),
});

export const equipmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Désignation obligatoire"),
  brandModel: optionalText,
  serialNumber: z.string().trim().min(1, "Numéro de série obligatoire"),
  categoryId: z.string({ error: "Catégorie obligatoire" }).uuid("Catégorie obligatoire"),
  lastInspectionOn: z
    .string()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || isIsoDate(v), "Date de vérification invalide"),
  active: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});
