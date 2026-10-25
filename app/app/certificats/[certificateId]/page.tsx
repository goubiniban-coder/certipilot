import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CertificateStatusBadge } from "@/components/certificate-status-badge";
import { formatDate } from "@/components/expiry-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { verificationUrl } from "@/lib/certificates/service";
import { certificateStatus, toIsoDate } from "@/lib/rules";
import { signedUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { RevokeCertificateForm } from "../forms";

export const metadata: Metadata = { title: "Certificat" };

type Row = {
  id: string;
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
  session_id: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  certificate_categories: { category_code: string; category_label: string }[];
};

export default async function CertificatePage({ params }: { params: Promise<{ certificateId: string }> }) {
  const session = await requireSession(["admin", "secretariat"]);
  const { certificateId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select(
      "id, number, holder_last_name, holder_first_name, holder_birth_date, holder_photo_path, recommendation_code, recommendation_label, issued_on, expires_on, verification_token, session_id, revoked_at, revocation_reason, certificate_categories(category_code, category_label)",
    )
    .eq("id", certificateId)
    .maybeSingle<Row>();
  if (!data) notFound();

  const status = certificateStatus({ expiresOn: data.expires_on, revokedAt: data.revoked_at }, toIsoDate(new Date()));
  const url = verificationUrl(data.verification_token);
  const [photo, qr] = await Promise.all([
    signedUrl("candidate-photos", data.holder_photo_path),
    QRCode.toDataURL(url, { margin: 1, width: 240 }),
  ]);
  const categories = [...data.certificate_categories].sort((a, b) =>
    a.category_code.localeCompare(b.category_code, "fr", { numeric: true }),
  );

  return (
    <>
      <PageHeader
        title={`Certificat ${data.number}`}
        description={
          <Link href={`/app/sessions/${data.session_id}`} className="underline">
            Voir la session
          </Link>
        }
        actions={<CertificateStatusBadge status={status} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader>
            <CardTitle>
              {data.recommendation_code} · {data.recommendation_label}
            </CardTitle>
            <CardDescription>Le certificat ne mentionne que les catégories obtenues.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex flex-wrap items-center gap-5">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={`Photo de ${data.holder_first_name} ${data.holder_last_name}`} className="h-36 w-28 rounded-md object-cover" />
              ) : (
                <div className="flex h-36 w-28 items-center justify-center rounded-md border-2 border-dashed text-sm">Pas de photo</div>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-lg">
                <dt className="text-muted-foreground">Titulaire</dt>
                <dd className="font-semibold">
                  {data.holder_last_name.toUpperCase()} {data.holder_first_name}
                </dd>
                <dt className="text-muted-foreground">Naissance</dt>
                <dd>{formatDate(data.holder_birth_date)}</dd>
                <dt className="text-muted-foreground">Délivré le</dt>
                <dd>{formatDate(data.issued_on)}</dd>
                <dt className="text-muted-foreground">Valable jusqu&apos;au</dt>
                <dd>{formatDate(data.expires_on)}</dd>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-lg font-bold">Catégories obtenues</h3>
              <ul className="grid gap-1">
                {categories.map((c) => (
                  <li key={c.category_code} className="rounded-md bg-muted px-3 py-2">
                    <strong>Cat. {c.category_code}</strong> · {c.category_label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={`/app/certificats/${data.id}/pdf`}>Télécharger le PDF</a>
              </Button>
              <Button asChild variant="outline">
                <a href={url} target="_blank" rel="noreferrer">
                  Page de vérification publique
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>QR code de vérification</CardTitle>
            </CardHeader>
            <CardContent className="grid justify-items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code menant à la page de vérification" className="size-48" />
              <p className="break-all text-sm text-muted-foreground">{url}</p>
            </CardContent>
          </Card>

          {data.revoked_at ? (
            <Alert variant="destructive">
              <AlertTitle>Révoqué le {new Date(data.revoked_at).toLocaleDateString("fr-FR")}</AlertTitle>
              <AlertDescription className="text-inherit">Motif : {data.revocation_reason}</AlertDescription>
            </Alert>
          ) : session.profile.role === "admin" ? (
            <Card>
              <CardHeader>
                <CardTitle>Révoquer</CardTitle>
              </CardHeader>
              <CardContent>
                <RevokeCertificateForm certificateId={data.id} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
