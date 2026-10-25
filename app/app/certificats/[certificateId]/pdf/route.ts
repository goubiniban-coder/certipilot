import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureCertificatePdf } from "@/lib/certificates/service";
import { createClient } from "@/lib/supabase/server";

/** Downloads a certificate PDF through a short-lived signed URL (private bucket). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ certificateId: string }> }) {
  const session = await getSession();
  if (!session || session.profile.role === "tester") {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  const { certificateId } = await params;
  const supabase = await createClient();
  // RLS: only certificates of the user's organization are visible.
  const { data: cert } = await supabase
    .from("certificates")
    .select("id, number, pdf_path")
    .eq("id", certificateId)
    .maybeSingle();
  if (!cert) return new NextResponse("Certificat introuvable.", { status: 404 });

  const path = cert.pdf_path ?? (await ensureCertificatePdf(cert.id));
  const { data } = await supabase.storage
    .from("certificates")
    .createSignedUrl(path, 60, { download: `${cert.number}.pdf` });
  if (!data?.signedUrl) return new NextResponse("PDF indisponible. Réessayez.", { status: 503 });

  await supabase.rpc("log_event", {
    p_action: "certificate_pdf_downloaded",
    p_table_name: "certificates",
    p_record_id: cert.id,
  });
  return NextResponse.redirect(data.signedUrl);
}
