"use client";

import { useRef, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { toIsoDate } from "@/lib/rules";
import { clearTesterDb, testerDb, type OfflineTest } from "@/lib/offline/db";
import { retryRejected } from "@/lib/offline/sync";
import { useLiveQuery } from "@/lib/offline/use-live-query";
import { formatDate } from "@/components/expiry-badge";
import { SyncIndicator } from "./sync-indicator";
import { candidateName, TestView } from "./test-view";
import { useSync } from "./use-sync";

function statusOf(test: OfflineTest, pendingIds: Set<string>) {
  if (test.conclusion || test.serverSigned) {
    const passed = (test.conclusion?.status ?? test.serverStatus) === "passed";
    return {
      label: `${passed ? "Réussi" : "Échoué"}${pendingIds.has(test.id) ? " · à envoyer" : ""}`,
      variant: passed ? ("success" as const) : ("destructive" as const),
    };
  }
  if (test.startedAt) return { label: "En cours", variant: "warning" as const };
  if (test.identity) return { label: "Identité contrôlée", variant: "secondary" as const };
  return { label: "À passer", variant: "outline" as const };
}

export function TesterApp({
  userId,
  testerId,
  testerName,
  organizationName,
}: {
  userId: string;
  testerId: string | null;
  testerName: string;
  organizationName: string;
}) {
  const sync = useSync(userId, testerId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const signOutForm = useRef<HTMLFormElement>(null);
  const today = toIsoDate(new Date());

  const tests = useLiveQuery(
    () => testerDb().tests.where("testDate").equals(today).toArray(),
    [today],
  );
  const queue = useLiveQuery(() => testerDb().queue.toArray(), []);
  const pendingIds = new Set((queue ?? []).map((entry) => entry.operation.testId));
  const selected = tests?.find((test) => test.id === selectedId) ?? null;
  const sorted = [...(tests ?? [])].sort((a, b) =>
    `${a.candidate.lastName} ${a.candidate.firstName}`.localeCompare(`${b.candidate.lastName} ${b.candidate.firstName}`, "fr"),
  );

  async function signOut() {
    if (sync.pending > 0 && !window.confirm("Des résultats ne sont pas encore envoyés. Ils seront perdus sur cette tablette. Se déconnecter quand même ?")) {
      return;
    }
    await clearTesterDb();
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR" });
    signOutForm.current?.submit();
  }

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {APP_NAME} · {organizationName}
          </p>
          <p className="text-xl font-semibold">{testerName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SyncIndicator state={sync.state} pending={sync.pending} />
          <form ref={signOutForm} action="/auth/deconnexion" method="post">
            <Button type="button" variant="ghost" size="sm" onClick={signOut}>
              Se déconnecter
            </Button>
          </form>
        </div>
      </header>

      {sync.rejected.length ? (
        <Alert variant="destructive">
          <AlertTitle>Le serveur a refusé {sync.rejected.length} modification(s)</AlertTitle>
          <AlertDescription className="grid gap-3">
            <ul className="list-disc pl-5">
              {sync.rejected.map((entry) => (
                <li key={entry.seq}>{entry.error}</li>
              ))}
            </ul>
            <p>Faites corriger le problème par le bureau, puis réessayez. Les résultats restent sur la tablette.</p>
            <div>
              <Button variant="outline" onClick={() => void retryRejected().then(sync.syncNow)}>
                Réessayer l&apos;envoi
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {!testerId ? (
        <Alert>
          <AlertTitle>Compte non lié à une fiche testeur</AlertTitle>
          <AlertDescription>
            Votre compte n&apos;est rattaché à aucun testeur de l&apos;organisme : demandez à un administrateur de vous
            inviter avec le rôle « Testeur ».
          </AlertDescription>
        </Alert>
      ) : selected ? (
        <TestView
          key={selected.id}
          test={selected}
          pendingSync={pendingIds.has(selected.id)}
          onBack={() => setSelectedId(null)}
          onChanged={() => void sync.syncNow()}
        />
      ) : (
        <section aria-labelledby="today-title" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 id="today-title" className="text-3xl font-bold">
              Candidats du jour
            </h1>
            <Button variant="outline" onClick={() => void sync.syncNow()} disabled={sync.state === "offline"}>
              <RefreshCw aria-hidden /> Actualiser
            </Button>
          </div>
          <p className="text-lg">
            {formatDate(today)}
            {sync.lastSyncAt ? ` · données du ${new Date(sync.lastSyncAt).toLocaleString("fr-FR")}` : ""}
          </p>
          {tests === undefined || !sync.ready ? (
            <p>Chargement…</p>
          ) : sorted.length === 0 ? (
            <p className="rounded-md border-2 border-dashed p-6 text-lg">
              Aucune épreuve pratique ne vous est attribuée aujourd&apos;hui.
              {sync.lastSyncAt ? "" : " Connectez la tablette au réseau pour télécharger vos épreuves."}
            </p>
          ) : (
            <ul className="grid gap-3">
              {sorted.map((test) => {
                const status = statusOf(test, pendingIds);
                return (
                  <li key={test.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(test.id)}
                      className="flex w-full items-center gap-4 rounded-md border-2 border-input bg-background p-4 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
                    >
                      <span className="grid flex-1 gap-1">
                        <span className="text-xl font-semibold">{candidateName(test)}</span>
                        <span>
                          {test.category.recommendationCode} cat. {test.category.code} ·{" "}
                          {test.equipment ? `${test.equipment.name} (n° ${test.equipment.serialNumber})` : "engin non renseigné"}
                        </span>
                      </span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <ChevronRight aria-hidden className="size-6" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            Les épreuves sont enregistrées sur la tablette : vous pouvez travailler sans réseau, l&apos;envoi se fera
            automatiquement au retour de la connexion.
          </p>
        </section>
      )}
    </main>
  );
}
