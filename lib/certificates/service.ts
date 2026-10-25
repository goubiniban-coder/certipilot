import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { publicEnv } from "@/lib/env";
import { normalizePhoto } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/server";
import { CertificateDocument, type CertificatePdfData } from "./document";

export function verificationUrl(token: string): string {
  return new URL(`/verifier/${token}`, publicEnv().NEXT_PUBLIC_APP_URL).toString();
}

interface CertificateRow {
  id: string;
  organization_id: string;
  number: string;
  holder_last_name: string;
  holder_first_name: string;
  holder_birth_date: string;
  holder_photo_path: string | null;
  recommendation_code: string;
  recommendation_label: string;
  issued_on: string;
  expires_on: string;
  verification_token: string;
  pdf_path: string | null;
  organizations: { name: string; siret: string };
  certificate_categories: { category_code: string; category_label: string }[];
}

async function photoDataUri(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await createAdminClient().storage.from("candidate-photos").download(path);
  if (!data) return null;
  try {
    const jpeg = await normalizePhoto(await data.arrayBuffer());
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Renders the PDF of an issued certificate, stores it in the private
 * "certificates" bucket and records its path (once: the certificate is
 * immutable). Runs with the service role, after the caller checked access.
 */
export async function ensureCertificatePdf(certificateId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: cert, error } = await admin
    .from("certificates")
    .select(
      "id, organization_id, number, holder_last_name, holder_first_name, holder_birth_date, holder_photo_path, recommendation_code, recommendation_label, issued_on, expires_on, verification_token, pdf_path, organizations(name, siret), certificate_categories(category_code, category_label)",
    )
    .eq("id", certificateId)
    .single<CertificateRow>();
  if (error || !cert) throw new Error("Certificat introuvable.");
  if (cert.pdf_path) return cert.pdf_path;

  const url = verificationUrl(cert.verification_token);
  const data: CertificatePdfData = {
    organizationName: cert.organizations.name,
    organizationSiret: cert.organizations.siret,
    number: cert.number,
    holderLastName: cert.holder_last_name,
    holderFirstName: cert.holder_first_name,
    holderBirthDate: cert.holder_birth_date,
    photo: await photoDataUri(cert.holder_photo_path),
    recommendationCode: cert.recommendation_code,
    recommendationLabel: cert.recommendation_label,
    categories: [...cert.certificate_categories]
      .sort((a, b) => a.category_code.localeCompare(b.category_code, "fr", { numeric: true }))
      .map((c) => ({ code: c.category_code, label: c.category_label })),
    issuedOn: cert.issued_on,
    expiresOn: cert.expires_on,
    verificationUrl: url,
    qrCode: await QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: "M" }),
  };
  const pdf = await renderToBuffer(CertificateDocument({ data }));

  const path = `${cert.organization_id}/${cert.issued_on.slice(0, 4)}/${cert.number}.pdf`;
  const upload = await admin.storage
    .from("certificates")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw new Error("L'enregistrement du PDF a échoué. Réessayez.");

  const { error: attachError } = await admin.rpc("attach_certificate_pdf", {
    p_certificate_id: cert.id,
    p_pdf_path: path,
  });
  if (attachError) throw new Error("L'enregistrement du PDF a échoué. Réessayez.");
  return path;
}
