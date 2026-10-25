import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { buildSessionAuditZip } from "@/lib/export/session-audit";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/** Audit ZIP of a session. Admin only: it contains the change log and identity data. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/connexion", request.url));
  if (session.profile.role !== "admin") {
    return new NextResponse("Seul le responsable du centre peut exporter le dossier d'audit.", { status: 403 });
  }
  const { sessionId } = await params;
  const result = await buildSessionAuditZip(sessionId, session.profile.full_name);
  if (!result) return new NextResponse("Session introuvable.", { status: 404 });

  const supabase = await createClient();
  await supabase.rpc("log_event", {
    p_action: "session_audit_exported",
    p_table_name: "sessions",
    p_record_id: sessionId,
  });
  return new NextResponse(new Uint8Array(result.zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${result.fileName}"`,
      "cache-control": "no-store",
    },
  });
}
