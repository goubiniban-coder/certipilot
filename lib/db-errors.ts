/**
 * Turns a Supabase / PostgreSQL error into a French message for the user.
 * Business errors raised by the database already carry a French message and
 * a stable code in `hint` (see supabase/migrations/*_triggers.sql).
 */
export interface DbError {
  message: string;
  code?: string;
  hint?: string | null;
  details?: string | null;
}

const GENERIC: Record<string, string> = {
  "42501": "Action non autorisée avec votre rôle.",
  "23505": "Cet élément existe déjà.",
  "23503": "Cet élément est encore utilisé ailleurs et ne peut pas être supprimé.",
  "23514": "Certaines valeurs ne respectent pas les règles attendues.",
  "22P02": "Une valeur saisie n'a pas le bon format.",
};

export function isBusinessError(error: DbError): boolean {
  return error.code === "P0001" && Boolean(error.hint);
}

export function dbErrorMessage(error: DbError | null | undefined): string {
  if (!error) return "Une erreur inattendue est survenue.";
  if (isBusinessError(error)) return error.message;
  if (error.code && GENERIC[error.code]) return GENERIC[error.code]!;
  if (/row-level security/i.test(error.message)) return GENERIC["42501"]!;
  return "Une erreur inattendue est survenue. Réessayez ou contactez votre responsable.";
}
