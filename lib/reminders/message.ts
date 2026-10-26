import type { Milestone } from "./due";

export interface ReminderContent {
  holderName: string;
  recommendationLabel: string;
  expiresOn: string;
  organizationName: string;
  milestone: Milestone;
}

const frenchDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "UTC" });

export function reminderEmail(c: ReminderContent): { subject: string; text: string } {
  const delay = c.milestone === "2_months" ? "dans moins de deux mois" : "dans environ six mois";
  return {
    subject: `CACES® de ${c.holderName} : renouvellement à prévoir`,
    text: [
      "Bonjour,",
      "",
      `Le CACES® « ${c.recommendationLabel} » de ${c.holderName} arrive à échéance ${delay}, le ${frenchDate(c.expiresOn)}.`,
      "Pour que l'autorisation de conduite ne soit pas interrompue, pensez à planifier dès maintenant la session de renouvellement.",
      "",
      `Pour réserver une place, répondez à ce message ou contactez ${c.organizationName}.`,
      "",
      "Cordialement,",
      c.organizationName,
    ].join("\n"),
  };
}
