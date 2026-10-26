import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import { BillingDocument } from "@/lib/billing/document";
import type { BillingLine } from "@/lib/billing/totals";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await getSession();
  if (!session || session.profile.role === "tester") {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  const { documentId } = await params;
  const supabase = await createClient();
  const [{ data: doc }, { data: org }] = await Promise.all([
    supabase
      .from("billing_documents")
      .select("kind, number, title, issued_on, due_on, vat_rate, lines, notes, client_companies(name, siret)")
      .eq("id", documentId)
      .maybeSingle(),
    supabase.from("organizations").select("address, vat_number").eq("id", session.organization.id).maybeSingle(),
  ]);
  if (!doc) return new NextResponse("Document introuvable.", { status: 404 });
  const client = doc.client_companies as unknown as { name: string; siret: string | null } | null;

  const pdf = await renderToBuffer(
    BillingDocument({
      data: {
        kind: doc.kind,
        number: doc.number,
        title: doc.title,
        issuedOn: doc.issued_on,
        dueOn: doc.due_on,
        vatRate: Number(doc.vat_rate),
        lines: doc.lines as BillingLine[],
        notes: doc.notes,
        issuer: {
          name: session.organization.name,
          siret: session.organization.siret,
          address: org?.address ?? null,
          vatNumber: org?.vat_number ?? null,
        },
        client,
      },
    }),
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${doc.number}.pdf"` },
  });
}
