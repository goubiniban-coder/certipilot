import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { formatDate } from "@/components/expiry-badge";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { CERTIFICATE_STATUS_LABELS, type CertificateStatus } from "@/lib/rules";
import { createAnonClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Vérification d'un certificat",
  robots: { index: false, follow: false },
};

type Verification = {
  number: string;
  holder_name: string;
  recommendation_code: string;
  recommendation_label: string;
  categories: { code: string; label: string }[];
  issued_on: string;
  expires_on: string;
  status: CertificateStatus;
  organization_name: string;
};

const STATUS_STYLE: Record<CertificateStatus, { className: string; Icon: typeof CheckCircle2; text: string }> = {
  valid: { className: "border-success bg-success text-success-foreground", Icon: CheckCircle2, text: "Ce certificat est authentique et en cours de validité." },
  expired: { className: "border-warning bg-warning text-warning-foreground", Icon: CircleAlert, text: "Ce certificat est authentique mais sa validité a expiré." },
  revoked: { className: "border-destructive bg-destructive text-destructive-foreground", Icon: XCircle, text: "Ce certificat a été révoqué par l'organisme testeur : il n'est plus valable." },
};

export default async function VerifyCertificatePage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const { data } = await createAnonClient().rpc("verify_certificate", { p_token: jeton });
  const cert = (data as Verification[] | null)?.[0];

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {APP_NAME} · Vérification de certificat
      </p>
      {!cert ? (
        <Card>
          <CardContent className="grid gap-2 pt-6">
            <h1 className="text-2xl font-bold">Certificat introuvable</h1>
            <p className="text-lg">
              Aucun certificat ne correspond à ce lien. Vérifiez l&apos;adresse ou le QR code, ou contactez l&apos;organisme
              testeur qui l&apos;a délivré.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={cn("flex items-center gap-4 rounded-lg border-2 p-5", STATUS_STYLE[cert.status].className)}>
            {(() => {
              const { Icon } = STATUS_STYLE[cert.status];
              return <Icon className="size-10 shrink-0" aria-hidden />;
            })()}
            <div>
              <h1 className="text-3xl font-bold">{CERTIFICATE_STATUS_LABELS[cert.status]}</h1>
              <p className="text-lg">{STATUS_STYLE[cert.status].text}</p>
            </div>
          </div>
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-lg">
                <dt className="text-muted-foreground">Numéro</dt>
                <dd className="font-semibold">{cert.number}</dd>
                <dt className="text-muted-foreground">Titulaire</dt>
                <dd className="font-semibold">{cert.holder_name}</dd>
                <dt className="text-muted-foreground">Recommandation</dt>
                <dd>
                  {cert.recommendation_code} · {cert.recommendation_label}
                </dd>
                <dt className="text-muted-foreground">Catégories</dt>
                <dd>
                  <ul>
                    {cert.categories.map((c) => (
                      <li key={c.code}>
                        <strong>Cat. {c.code}</strong> · {c.label}
                      </li>
                    ))}
                  </ul>
                </dd>
                <dt className="text-muted-foreground">Délivré le</dt>
                <dd>{formatDate(cert.issued_on)}</dd>
                <dt className="text-muted-foreground">Valable jusqu&apos;au</dt>
                <dd>{formatDate(cert.expires_on)}</dd>
                <dt className="text-muted-foreground">Organisme testeur</dt>
                <dd>{cert.organization_name}</dd>
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
