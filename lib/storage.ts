import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

/** Private buckets (see supabase/migrations/*_storage.sql). */
export type Bucket =
  | "candidate-photos"
  | "identity-documents"
  | "tester-documents"
  | "signatures"
  | "certificates";

/** Signed URLs are short-lived (GDPR): 5 minutes by default. */
export const SIGNED_URL_SECONDS = 300;

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Checks an uploaded photo; returns a French error message or null. */
export function photoError(file: File): string | null {
  if (!IMAGE_TYPES[file.type]) return "La photo doit être une image JPEG, PNG ou WebP.";
  if (file.size > MAX_PHOTO_BYTES) return "La photo ne doit pas dépasser 5 Mo.";
  return null;
}

/** Uploads a photo under "<organization_id>/<folder>/<uuid>.<ext>" as the signed-in user. */
export async function uploadPhoto(organizationId: string, folder: string, file: File) {
  const path = `${organizationId}/${folder}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("candidate-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error("L'envoi de la photo a échoué. Réessayez.");
  return path;
}

export async function signedUrl(bucket: Bucket, path: string | null, seconds = SIGNED_URL_SECONDS) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
