import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/components/expiry-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SESSION_STATUS_LABELS, type TestSession } from "@/lib/types";
import { SessionForm } from "./forms";

export const metadata: Metadata = { title: "Sessions" };

type Row = TestSession & { session_candidates: { count: number }[] };

export default async function SessionsPage() {
  await requireSession(["admin", "secretariat"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("id, name, starts_on, ends_on, location, status, notes, session_candidates(count)")
    .order("starts_on", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader title="Sessions" description="Préparez les sessions de test et suivez leurs résultats." />
      <div className="grid gap-6 2xl:grid-cols-[1fr_32rem]">
        <Card className="content-start">
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Candidats</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as Row[] | null)?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/app/sessions/${s.id}`} className="font-semibold text-primary underline">
                        {s.name}
                      </Link>
                      <div className="text-sm text-muted-foreground">{s.location}</div>
                    </TableCell>
                    <TableCell>
                      {formatDate(s.starts_on)}
                      {s.ends_on !== s.starts_on ? ` au ${formatDate(s.ends_on)}` : ""}
                    </TableCell>
                    <TableCell>{s.session_candidates[0]?.count ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "closed" ? "secondary" : "outline"}>{SESSION_STATUS_LABELS[s.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Nouvelle session</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
