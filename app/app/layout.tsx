import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth";

export default async function BackOfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["admin", "secretariat"]);
  return <AppShell session={session}>{children}</AppShell>;
}
