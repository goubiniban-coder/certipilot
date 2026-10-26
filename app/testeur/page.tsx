import type { Metadata, Viewport } from "next";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { TesterApp } from "@/components/testeur/tester-app";

export const metadata: Metadata = {
  title: "Application testeur",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Testeur" },
};

export const viewport: Viewport = { themeColor: "#172554" };

export default async function TesterHomePage() {
  const session = await requireSession(["tester", "admin"]);
  const supabase = await createClient();
  const { data: tester } = await supabase
    .from("testers")
    .select("id")
    .eq("profile_id", session.userId)
    .maybeSingle<{ id: string }>();

  return (
    <>
      <RegisterServiceWorker />
      <TesterApp
        userId={session.userId}
        testerId={tester?.id ?? null}
        testerName={session.profile.full_name}
        organizationName={session.organization.name}
      />
    </>
  );
}
