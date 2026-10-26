import type { Metadata } from "next";
import Link from "next/link";
import { CertificateStatusBadge } from "@/components/certificate-status-badge";
import { formatDate } from "@/components/expiry-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth";
import { certificateStatus, toIsoDate } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Certificats" };

type Row = {
  id: string;
  number: string;
  holder_last_name: string;
  holder_first_name: string;
  recommendation_code: string;
  issued_on: string;
  expires_on: string;
  revoked_at: string | null;
  certificate_categories: { category_code: string }[];
};

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSession(["admin", "secretariat"]);
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("certificates")
    .select("id, number, holder_last_name, holder_first_name, recommendation_code, issued_on, expires_on, revoked_at, certificate_categories(category_code)")
    .order("created_at", { ascending: false })
    .limit(200);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`number.ilike.%${term}%,holder_last_name.ilike.%${term}%,holder_first_name.ilike.%${term}%`);
  const { data } = await query;
  const rows = (data as Row[] | null) ?? [];
  const today = toIsoDate(new Date());

  return (
    <>
      <PageHeader guide={["Un certificat se délivre depuis la page de la session, quand les épreuves sont réussies.", "Chaque certificat a un QR code : n'importe qui peut en vérifier l'authenticité.", "Ici, retrouvez, téléchargez ou révoquez les certificats déjà délivrés."]}
        title="Certificats"
        description="Les certificats se délivrent depuis la page de la session, une fois la théorie et la pratique réussies."
      />
      <Card>
        <CardContent className="grid gap-4">
          <form className="flex gap-3" role="search">
            <Input name="q" defaultValue={q} placeholder="Numéro ou nom du titulaire" aria-label="Rechercher un certificat" />
            <Button type="submit" variant="secondary">
              Rechercher
            </Button>
          </form>
          {rows.length === 0 ? (
            <p className="text-lg">Aucun certificat pour l&apos;instant.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Titulaire</TableHead>
                  <TableHead>Recommandation</TableHead>
                  <TableHead>Délivré le</TableHead>
                  <TableHead>Valable jusqu&apos;au</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/app/certificats/${c.id}`} className="font-semibold text-primary underline">
                        {c.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {c.holder_last_name.toUpperCase()} {c.holder_first_name}
                    </TableCell>
                    <TableCell>
                      {c.recommendation_code} cat. {c.certificate_categories.map((x) => x.category_code).sort().join(", ")}
                    </TableCell>
                    <TableCell>{formatDate(c.issued_on)}</TableCell>
                    <TableCell>{formatDate(c.expires_on)}</TableCell>
                    <TableCell>
                      <CertificateStatusBadge status={certificateStatus({ expiresOn: c.expires_on, revokedAt: c.revoked_at }, today)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
