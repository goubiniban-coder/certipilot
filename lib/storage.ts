import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
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

/**
 * Re-encodes a photo as a JPEG of at most 800 px, turned upright and without
 * metadata (EXIF, GPS): smaller files, no hidden personal data, and a format
 * the certificate PDF can embed.
 */
export async function normalizePhoto(input: ArrayBuffer | Buffer): Promise<Buffer> {
  return sharp(Buffer.from(input as ArrayBuffer))
    .rotate()
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/** Uploads a photo under "<organization_id>/<folder>/<uuid>.jpg" as the signed-in user. */
export async function uploadPhoto(organizationId: string, folder: string, file: File) {
  const path = `${organizationId}/${folder}/${randomUUID()}.jpg`;
  let body: Buffer;
  try {
    body = await normalizePhoto(await file.arrayBuffer());
  } catch {
    throw new Error("Cette image ne peut pas être lue. Essayez une autre photo.");
  }
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("candidate-photos")
    .upload(path, body, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error("L'envoi de la photo a échoué. Réessayez.");
  return path;
}

export async function signedUrl(bucket: Bucket, path: string | null, seconds = SIGNED_URL_SECONDS) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
