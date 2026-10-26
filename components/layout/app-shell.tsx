import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import type { Session } from "@/lib/auth";
import { ROLE_LABELS, type AppRole } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  roles: readonly AppRole[];
}

const BACK_OFFICE: readonly AppRole[] = ["admin", "secretariat"];

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/app", label: "Tableau de bord", roles: BACK_OFFICE },
  { href: "/app/sessions", label: "Sessions", roles: BACK_OFFICE },
  { href: "/app/candidats", label: "Candidats", roles: BACK_OFFICE },
  { href: "/app/entreprises", label: "Entreprises clientes", roles: BACK_OFFICE },
  { href: "/app/certificats", label: "Certificats", roles: BACK_OFFICE },
  { href: "/app/facturation", label: "Devis et factures", roles: BACK_OFFICE },
  { href: "/app/testeurs", label: "Testeurs", roles: BACK_OFFICE },
  { href: "/app/engins", label: "Engins", roles: BACK_OFFICE },
  { href: "/app/referentiel", label: "Référentiel", roles: BACK_OFFICE },
  { href: "/app/utilisateurs", label: "Utilisateurs", roles: ["admin"] },
  { href: "/app/organisme", label: "Organisme", roles: ["admin"] },
];

export function AppShell({ session, children }: { session: Session; children: React.ReactNode }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(session.profile.role));
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="bg-marine text-white lg:min-h-screen">
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo size={40} />
          <div className="min-w-0">
            <Link href="/app" className="font-display text-2xl leading-none font-bold">
              {APP_NAME}
            </Link>
            <p className="mt-1 truncate text-sm text-white/70">{session.organization.name}</p>
          </div>
        </div>
        <NavLinks items={items} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center justify-end gap-4 px-6 py-3">
          <span className="text-base">
            <strong>{session.profile.full_name}</strong> · {ROLE_LABELS[session.profile.role]}
          </span>
          <form action="/auth/deconnexion" method="post">
            <Button type="submit" variant="outline" size="sm">
              Se déconnecter
            </Button>
          </form>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold">{title}</h1>
        {description ? <p className="text-lg text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
