import {
  Award,
  CalendarPlus,
  CheckCircle2,
  Circle,
  FileText,
  Rocket,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { WarehouseIllustration } from "@/components/brand/warehouse-illustration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SetupProgress } from "@/lib/queries/dashboard";

/** Big friendly banner: who is signed in, and what needs attention today in one sentence. */
export function WelcomeBanner({
  name,
  organization,
  sessionsSoon,
  alerts,
  renewals,
}: {
  name: string;
  organization: string;
  sessionsSoon: number;
  alerts: number;
  renewals: number;
}) {
  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
  const todo = [
    sessionsSoon ? plural(sessionsSoon, "session cette semaine", "sessions cette semaine") : null,
    alerts ? plural(alerts, "alerte à regarder", "alertes à regarder") : null,
    renewals ? plural(renewals, "renouvellement à prévoir", "renouvellements à prévoir") : null,
  ].filter(Boolean);
  return (
    <section
      aria-label="Bienvenue"
      className="relative overflow-hidden rounded-3xl bg-marine text-white shadow-[0_8px_0_rgba(23,37,84,.18)]"
    >
      <div className="grid items-center gap-4 p-6 md:grid-cols-[1fr_minmax(0,22rem)] md:p-8">
        <div className="grid gap-3">
          <p className="font-display text-4xl leading-none font-bold md:text-5xl">
            Bonjour, <span className="text-yellow">{name}</span>
          </p>
          <p className="text-lg text-white/85">
            {todo.length
              ? `Voici ce qui vous attend chez ${organization} : ${todo.join(", ")}.`
              : `Tout est calme chez ${organization}. Profitez-en pour préparer la prochaine session !`}
          </p>
        </div>
        <div className="hidden overflow-hidden rounded-2xl border-4 border-yellow md:block">
          <WarehouseIllustration className="block h-auto w-full" />
        </div>
      </div>
    </section>
  );
}

const ACTIONS: { href: string; label: string; hint: string; Icon: LucideIcon; tone: string }[] = [
  { href: "/app/sessions", label: "Planifier une session", hint: "Une date, un lieu, des candidats", Icon: CalendarPlus, tone: "bg-yellow text-yellow-foreground" },
  { href: "/app/candidats/import", label: "Ajouter des candidats", hint: "Depuis un fichier Excel ou CSV", Icon: UserPlus, tone: "bg-blue-600 text-white" },
  { href: "/app/certificats", label: "Délivrer un certificat", hint: "Pour un candidat qui a réussi", Icon: Award, tone: "bg-green-700 text-white" },
  { href: "/app/facturation", label: "Faire un devis", hint: "Puis le transformer en facture", Icon: FileText, tone: "bg-orange-600 text-white" },
];

/** Four big buttons for the things people do most, in plain words. */
export function QuickActions() {
  return (
    <section aria-label="Actions rapides" className="grid gap-3">
      <h2 className="font-display text-2xl font-bold">Que voulez-vous faire ?</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map(({ href, label, hint, Icon, tone }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs transition motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className={`flex size-14 shrink-0 items-center justify-center rounded-xl ${tone} transition motion-safe:group-hover:rotate-6`}>
                <Icon className="size-7" aria-hidden />
              </span>
              <span className="grid">
                <span className="font-display text-xl leading-tight font-bold">{label}</span>
                <span className="text-sm text-muted-foreground">{hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** First-setup guide: shown until every step is done, then it disappears. */
export function GettingStarted({ progress }: { progress: SetupProgress }) {
  const steps = [
    { done: progress.testers > 0, label: "Ajoutez un testeur", hint: "La personne qui fait passer les épreuves.", href: "/app/testeurs" },
    { done: progress.equipment > 0, label: "Ajoutez un engin", hint: "Chariot, grue, nacelle… celui des épreuves.", href: "/app/engins" },
    { done: progress.candidates > 0, label: "Ajoutez des candidats", hint: "Un par un, ou d'un coup depuis un fichier.", href: "/app/candidats" },
    { done: progress.sessions > 0, label: "Planifiez une session", hint: "Choisissez la date, le lieu, les testeurs.", href: "/app/sessions" },
    { done: progress.certificates > 0, label: "Délivrez votre premier certificat", hint: "Une fois l'épreuve réussie et signée.", href: "/app/certificats" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.find((s) => !s.done);
  return (
    <Card className="border-yellow border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Rocket className="size-7 text-primary" aria-hidden /> Pour démarrer
        </CardTitle>
        <CardDescription>
          {done} étape{done > 1 ? "s" : ""} sur {steps.length}. Suivez le guide, c&apos;est l&apos;affaire de quelques minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${done} étapes sur ${steps.length} terminées`}>
          <div className="h-full rounded-full bg-yellow transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <ol className="grid gap-2">
          {steps.map((s) => (
            <li key={s.label}>
              <Link
                href={s.href}
                className={`flex items-center gap-3 rounded-xl p-3 ${s === next ? "bg-yellow/25 ring-2 ring-yellow" : "bg-muted/60"}`}
              >
                {s.done ? (
                  <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden />
                ) : (
                  <Circle className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="grid">
                  <span className={`font-semibold ${s.done ? "line-through opacity-60" : ""}`}>{s.label}</span>
                  <span className="text-sm text-muted-foreground">{s.hint}</span>
                </span>
                {s === next ? <span className="ml-auto font-bold text-primary">C&apos;est par ici →</span> : null}
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
