/**
 * Provisional product name. CACES® is a registered trademark of the Cnam:
 * the product name must never contain it. Change it here only.
 */
export const APP_NAME = "Certipilot";

export const APP_DESCRIPTION =
  "Gestion des tests CACES® pour les organismes testeurs certifiés";

/** Practical tests are scored out of this value. */
export const PRACTICAL_MAX_SCORE = 100;

/** Public origin, used for canonical URLs, the sitemap and social previews. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://certipilot.vercel.app";
