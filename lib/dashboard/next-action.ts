export interface NextActionInput {
  /** Alerts already past their due date. */
  expiredAlerts: { href: string; title: string }[];
  expiringAlerts: number;
  sessionToday: { id: string; name: string } | null;
  /** First undone step of the first-setup guide, if any. */
  setupStep: { label: string; href: string } | null;
  renewals: number;
}

export interface NextAction {
  tone: "urgent" | "today" | "setup" | "growth" | "calm";
  title: string;
  detail: string;
  cta: string;
  href: string;
}

/** The single most useful thing to do now, in priority order. */
export function nextAction(i: NextActionInput): NextAction {
  const expired = i.expiredAlerts[0];
  if (expired) {
    const more = i.expiredAlerts.length - 1;
    return {
      tone: "urgent",
      title: "Une échéance est dépassée",
      detail: `${expired.title}${more ? ` et ${more} autre${more > 1 ? "s" : ""}` : ""}. Tant que ce n'est pas réglé, vous risquez de ne plus être en règle.`,
      cta: "Voir et régler",
      href: expired.href,
    };
  }
  if (i.sessionToday) {
    return {
      tone: "today",
      title: "Une session a lieu aujourd'hui",
      detail: `${i.sessionToday.name} : ouvrez-la pour faire l'appel et suivre les épreuves.`,
      cta: "Ouvrir la session",
      href: `/app/sessions/${i.sessionToday.id}`,
    };
  }
  if (i.setupStep) {
    return {
      tone: "setup",
      title: "Continuons la mise en route",
      detail: `Prochaine étape : ${i.setupStep.label.toLowerCase()}.`,
      cta: "C'est parti",
      href: i.setupStep.href,
    };
  }
  if (i.renewals > 0) {
    return {
      tone: "growth",
      title: `${i.renewals} certificat${i.renewals > 1 ? "s" : ""} à renouveler bientôt`,
      detail: "Proposez une session à ces entreprises avant l'échéance : c'est du travail en plus pour vous.",
      cta: "Planifier une session",
      href: "/app/sessions",
    };
  }
  return {
    tone: "calm",
    title: "Tout est à jour",
    detail: i.expiringAlerts
      ? `${i.expiringAlerts} échéance${i.expiringAlerts > 1 ? "s" : ""} approche${i.expiringAlerts > 1 ? "nt" : ""}, rien d'urgent.`
      : "Aucune alerte, aucune session en retard. Vous pouvez préparer la suite.",
    cta: "Planifier une session",
    href: "/app/sessions",
  };
}

/** 0 to 100: how healthy the center's compliance is (testers' CACES®, equipment inspections). */
export function complianceScore(expired: number, expiring: number): number {
  return Math.max(0, 100 - expired * 25 - expiring * 10);
}

export function complianceMood(score: number): { label: string; tone: "good" | "watch" | "bad" } {
  if (score >= 100) return { label: "Impeccable", tone: "good" };
  if (score >= 70) return { label: "À surveiller", tone: "watch" };
  return { label: "À corriger vite", tone: "bad" };
}
