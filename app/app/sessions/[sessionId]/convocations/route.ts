import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import { ConvocationDocument } from "@/lib/convocations/document";
import { createClient } from "@/lib/supabase/server";

/** One PDF with a convocation page per candidate of the session. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession();
  if (!session || session.profile.role === "tester") {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  const { sessionId } = await params;
  const supabase = await createClient();
  const [{ data: test }, { data: rows }] = await Promise.all([
    supabase.from("sessions").select("name, starts_on, ends_on, location").eq("id", sessionId).maybeSingle(),
    supabase
      .from("session_candidates")
      .select("candidates(first_name, last_name, client_companies(name)), practical_tests(categories(code, recommendations(code)))")
      .eq("session_id", sessionId),
  ]);
  if (!test) return new NextResponse("Session introuvable.", { status: 404 });
  if (!rows?.length) return new NextResponse("Aucun candidat dans cette session.", { status: 404 });

  type Row = {
    candidates: { first_name: string; last_name: string; client_companies: { name: string } | null };
    practical_tests: { categories: { code: string; recommendations: { code: string } | null } | null }[];
  };
  const candidates = (rows as unknown as Row[])
    .map((r) => ({
      firstName: r.candidates.first_name,
      lastName: r.candidates.last_name,
      company: r.candidates.client_companies?.name ?? null,
      tests: [
        ...new Set(
          r.practical_tests
            .map((t) => t.categories && `${t.categories.recommendations?.code ?? ""} cat. ${t.categories.code}`.trim())
            .filter((v): v is string => !!v),
        ),
      ],
    }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr"));

  const pdf = await renderToBuffer(
    ConvocationDocument({
      data: {
        organizationName: session.organization.name,
        organizationSiret: session.organization.siret,
        sessionName: test.name,
        startsOn: test.starts_on,
        endsOn: test.ends_on,
        location: test.location,
        candidates,
      },
    }),
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="convocations-${sessionId.slice(0, 8)}.pdf"`,
    },
  });
}
