import { NextResponse, type NextRequest } from "next/server";
import { sendRenewalReminders } from "@/lib/reminders/run";

export const dynamic = "force-dynamic";

/** Called once a day by Vercel Cron, which sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await sendRenewalReminders());
}
