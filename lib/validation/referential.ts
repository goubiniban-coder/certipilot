import { z } from "zod";

const optionalInt = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(
      z
        .number({ error: `${label} invalide` })
        .int(`${label} invalide`)
        .min(min, `${label} : au moins ${min}`)
        .max(max, `${label} : au plus ${max}`)
        .nullable(),
    );

export const recommendationSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(2, "Libellé obligatoire"),
  validityYears: z.coerce
    .number({ error: "Durée invalide" })
    .int("Durée invalide")
    .min(1, "Au moins 1 an")
    .max(20, "Au plus 20 ans"),
  theoryPassPercent: z.coerce
    .number({ error: "Seuil invalide" })
    .min(0, "Entre 0 et 100")
    .max(100, "Entre 0 et 100"),
  requiresIpr: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  recommendationId: z.string().uuid(),
  code: z.string().trim().min(1, "Code obligatoire").max(10, "Code trop long"),
  label: z.string().trim().min(2, "Libellé obligatoire"),
  validityYears: optionalInt(1, 20, "Durée de validité"),
  practicalDurationMinutes: optionalInt(1, 600, "Durée du test"),
  active: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export const gridItemSchema = z.object({
  label: z.string().trim().min(2, "Libellé du critère obligatoire"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null),
  maxPoints: z.coerce
    .number({ error: "Points invalides" })
    .min(0, "Points positifs uniquement")
    .max(100, "Au plus 100 points"),
  eliminatory: z.boolean(),
});

export const gridSchema = z.object({
  gridId: z.string().uuid(),
  name: z.string().trim().min(2, "Nom de la grille obligatoire"),
  passScore: z.coerce.number({ error: "Seuil invalide" }).min(0).max(100),
  items: z.array(gridItemSchema).min(1, "La grille doit contenir au moins un critère"),
});

export type GridInput = z.input<typeof gridSchema>;
