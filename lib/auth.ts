import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Organization, Profile } from "@/lib/types";

export interface Session {
  userId: string;
  email: string;
  profile: Profile;
  organization: Organization;
}

/** Current user with profile and organization, or null. Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id, role, full_name, email, active")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile || !profile.active) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, siret, certificate_prefix, retention_months")
    .eq("id", profile.organization_id)
    .single<Organization>();
  if (!organization) return null;

  return { userId: user.id, email: user.email ?? profile.email, profile, organization };
});

/** Home page of a role after sign-in. */
export function homeFor(role: AppRole): string {
  return role === "tester" ? "/testeur" : "/app";
}

/** Redirects to the sign-in page, or to the user's home if the role is not allowed. */
export async function requireSession(roles?: readonly AppRole[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (roles && !roles.includes(session.profile.role)) redirect(homeFor(session.profile.role));
  return session;
}
