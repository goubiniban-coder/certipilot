import { ArrowRight, CalendarClock, PartyPopper, Rocket, Siren, TrendingUp, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { complianceMood, type NextAction } from "@/lib/dashboard/next-action";

const TONES: Record<NextAction["tone"], { Icon: LucideIcon; box: string; icon: string }> = {
  urgent: { Icon: Siren, box: "border-destructive bg-red-50", icon: "bg-destructive text-white" },
  today: { Icon: CalendarClock, box: "border-primary bg-blue-50", icon: "bg-primary text-white" },
  setup: { Icon: Rocket, box: "border-yellow bg-yellow/15", icon: "bg-yellow text-yellow-foreground" },
  growth: { Icon: TrendingUp, box: "border-green-700 bg-green-50", icon: "bg-green-700 text-white" },
  calm: { Icon: PartyPopper, box: "border-green-700 bg-green-50", icon: "bg-green-700 text-white" },
};

/** The one thing to do next, as a single big call to action. */
export function NextBestAction({ action }: { action: NextAction }) {
  const { Icon, box, icon } = TONES[action.tone];
  return (
    <section aria-label="Prochaine action conseillée" className={`flex flex-wrap items-center gap-4 rounded-2xl border-2 p-5 ${box}`}>
      <span className={`flex size-16 shrink-0 items-center justify-center rounded-2xl ${icon}`}>
        <Icon className="size-8" aria-hidden />
      </span>
      <div className="grid min-w-56 flex-1 gap-1">
        <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">À faire maintenant</p>
        <p className="font-display text-3xl leading-tight font-bold">{action.title}</p>
        <p className="text-lg">{action.detail}</p>
      </div>
      <Link
        href={action.href}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-marine px-5 text-lg font-bold text-white shadow-[0_4px_0_#0b1235] transition motion-safe:hover:translate-y-0.5 motion-safe:hover:shadow-[0_2px_0_#0b1235]"
      >
        {action.cta} <ArrowRight className="size-5" aria-hidden />
      </Link>
    </section>
  );
}

/** Ring gauge of the center's compliance, with a plain-words verdict. */
export function ComplianceGauge({ score, expired, expiring }: { score: number; expired: number; expiring: number }) {
  const mood = complianceMood(score);
  const color = mood.tone === "good" ? "#15803d" : mood.tone === "watch" ? "#d97706" : "#b91c1c";
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <Card>
      <CardContent className="flex items-center gap-5">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
            <circle
              cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
              className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-3xl font-bold tabular-nums">{score}</span>
        </div>
        <div className="grid gap-1">
          <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Conformité du centre</p>
          <p className="font-display text-2xl leading-tight font-bold" style={{ color }}>{mood.label}</p>
          <p className="text-sm text-muted-foreground">
            {expired || expiring
              ? `${expired} dépassée${expired > 1 ? "s" : ""}, ${expiring} bientôt`
              : "Testeurs et engins sont à jour."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
