import "server-only";

export interface Email {
  to: string[];
  subject: string;
  text: string;
  senderName: string;
}

export function brevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.REMINDER_SENDER_EMAIL);
}

/** Sends one transactional e-mail through the Brevo API. Throws on failure. */
export async function sendEmail(mail: Email): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY ?? "", "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: mail.senderName, email: process.env.REMINDER_SENDER_EMAIL },
      to: mail.to.map((email) => ({ email })),
      subject: mail.subject,
      textContent: mail.text,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}`);
}
