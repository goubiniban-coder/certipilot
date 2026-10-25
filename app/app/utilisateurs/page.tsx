import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Invitation, type Profile } from "@/lib/types";
import { cancelInvitation } from "./actions";
import { InviteForm, MemberRow } from "./forms";

export const metadata: Metadata = { title: "Utilisateurs" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "Europe/Paris" });

export default async function UsersPage() {
  const session = await requireSession(["admin"]);
  const supabase = await createClient();
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase.from("profiles").select("id, organization_id, role, full_name, email, active").order("full_name"),
    supabase
      .from("invitations")
      .select("id, organization_id, email, full_name, role, token, expires_at, accepted_at, created_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;

  return (
    <>
      <PageHeader title="Utilisateurs" description="Responsables, secrétariat et testeurs de votre organisme." />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader>
            <CardTitle>Membres</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle et statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members as Profile[] | null)?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-semibold">{member.full_name}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </TableCell>
                    <TableCell>
                      {member.id === session.userId ? (
                        <Badge variant="secondary">{ROLE_LABELS[member.role]} (vous)</Badge>
                      ) : (
                        <MemberRow member={member} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Inviter une personne</CardTitle>
            </CardHeader>
            <CardContent>
              <InviteForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invitations en attente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {(invitations as Invitation[] | null)?.length ? null : (
                <p className="text-muted-foreground">Aucune invitation en attente.</p>
              )}
              {(invitations as Invitation[] | null)?.map((invitation) => {
                const expired = new Date(invitation.expires_at) < new Date();
                return (
                  <div key={invitation.id} className="grid gap-2 rounded-md border-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{invitation.full_name}</strong>
                      <Badge variant={expired ? "destructive" : "outline"}>
                        {expired ? "Expirée" : `Jusqu'au ${dateFormat.format(new Date(invitation.expires_at))}`}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      {invitation.email} · {ROLE_LABELS[invitation.role]}
                    </div>
                    <input
                      readOnly
                      aria-label={`Lien d'invitation de ${invitation.full_name}`}
                      className="w-full rounded border bg-muted px-2 py-1 font-mono text-sm"
                      value={`${appUrl}/invitation/${invitation.token}`}
                    />
                    <form action={cancelInvitation}>
                      <input type="hidden" name="id" value={invitation.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Annuler l&apos;invitation
                      </Button>
                    </form>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
