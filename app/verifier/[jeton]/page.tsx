import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { formatDate } from "@/components/expiry-badge";
import { FamilyPicto } from "@/components/brand/family-picto";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { familyStyle } from "@/lib/families";
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

  const family = cert ? familyStyle(cert.recommendation_code) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 bg-[var(--marine)] px-5 py-4 text-white">
        <Link href="/" className="flex items-center gap-3 font-display text-2xl font-bold">
          <Logo size={34} />
          {APP_NAME}
        </Link>
        <span className="ml-auto text-sm font-semibold text-white/70">Vérification de certificat</span>
      </header>
      <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8">
        {!cert ? (
          <Card>
            <CardContent className="grid gap-2 pt-6">
              <h1 className="font-display text-3xl font-bold">Certificat introuvable</h1>
              <p className="text-lg">
                Aucun certificat ne correspond à ce lien. Vérifiez l&apos;adresse ou le QR code, ou contactez
                l&apos;organisme testeur qui l&apos;a délivré.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div
              role="status"
              className={cn(
                "flex items-center gap-4 rounded-2xl border-2 p-5 shadow-[0_6px_0_rgba(23,37,84,.15)]",
                STATUS_STYLE[cert.status].className,
              )}
            >
              {(() => {
                const { Icon } = STATUS_STYLE[cert.status];
                return <Icon className="size-14 shrink-0" aria-hidden />;
              })()}
              <div>
                <h1 className="font-display text-5xl font-bold leading-none">{CERTIFICATE_STATUS_LABELS[cert.status]}</h1>
                <p className="mt-1 text-lg">{STATUS_STYLE[cert.status].text}</p>
              </div>
            </div>
            <Card className="overflow-hidden p-0">
              <div className="flex items-center gap-4 border-b bg-muted/60 p-5">
                {family && <FamilyPicto code={cert.recommendation_code} size={56} />}
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {cert.recommendation_code} · {cert.recommendation_label}
                  </p>
                  <p className="font-display text-3xl font-bold leading-tight">{cert.holder_name}</p>
                </div>
              </div>
              <CardContent className="grid gap-4 pb-6">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-lg">
                  <dt className="text-muted-foreground">Numéro</dt>
                  <dd className="font-semibold">{cert.number}</dd>
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
            <p className="text-center text-sm text-muted-foreground">
              Vérifié en direct auprès de {APP_NAME}. CACES® est une marque déposée de la Cnam.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
