import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.rpc("log_event", { p_action: "sign_out" });
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/connexion", request.url), { status: 303 });
}
