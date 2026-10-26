"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { FamilyPicto } from "@/components/brand/family-picto";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate } from "@/components/expiry-badge";
import {
  checkIdentity,
  evaluatePractical,
  IDENTITY_DOCUMENT_TYPES,
  type IdentityDocumentType,
  type PracticalOutcome,
} from "@/lib/rules";
import { testerDb, type LocalMark, type OfflineGridItem, type OfflineTest } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";
import { SignaturePad } from "./signature-pad";
import { formatDuration, Stopwatch } from "./stopwatch";

export function candidateName(test: OfflineTest) {
  return `${test.candidate.firstName} ${test.candidate.lastName}`;
}

export function outcomeOf(test: OfflineTest): PracticalOutcome {
  return evaluatePractical(
    test.grid.items,
    Object.entries(test.marks).map(([gridItemId, mark]) => ({ gridItemId, ...mark })),
    test.grid.passScore,
  );
}

function CandidatePhoto({ photo, name }: { photo: Blob | null; name: string }) {
  const url = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  if (!url) {
    return (
      <div className="flex size-32 items-center justify-center rounded-xl border-2 border-dashed text-center text-sm text-muted-foreground">
        Pas de photo
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`Photo de ${name}`} className="size-32 rounded-xl object-cover" />;
}

function Header({ test }: { test: OfflineTest }) {
  const name = candidateName(test);
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4">
        <CandidatePhoto photo={test.candidate.photo} name={name} />
        <div className="grid min-w-0 flex-1 gap-1">
          <h1 className="text-4xl font-bold">{name}</h1>
          <p className="text-lg">Né(e) le {formatDate(test.candidate.birthDate)}</p>
          <p className="text-lg">
            <strong>
              {test.category.recommendationCode} cat. {test.category.code}
            </strong>{" "}
            · {test.category.label}
          </p>
          <p>
            Engin : {test.equipment ? `${test.equipment.name} (n° ${test.equipment.serialNumber})` : "non renseigné"}
          </p>
          <p className="text-muted-foreground">
            {test.sessionName}
            {test.sessionLocation ? ` · ${test.sessionLocation}` : ""}
          </p>
        </div>
        <FamilyPicto code={test.category.recommendationCode} size={72} />
      </CardContent>
    </Card>
  );
}

function IdentityStep({ test, onChanged }: { test: OfflineTest; onChanged: () => void }) {
  const [documentType, setDocumentType] = useState<IdentityDocumentType | "">("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const verifiedAt = new Date().toISOString();
    const violations = checkIdentity(
      { documentType: documentType || null, documentNumber, verified, verifiedAt },
      candidateName(test),
    );
    if (violations.length) {
      setMessage(violations[0]!.message);
      return;
    }
    const identity = { documentType: documentType as IdentityDocumentType, documentNumber: documentNumber.trim(), verifiedAt };
    await testerDb().tests.update(test.id, { identity });
    await enqueue({ kind: "identity", testId: test.id, sessionCandidateId: test.sessionCandidateId, identity });
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Contrôle d&apos;identité</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <p>Comparez la pièce d&apos;identité avec la photo et le nom du candidat.</p>
          <div className="grid gap-2">
            <Label htmlFor="identity-type">Type de pièce</Label>
            <NativeSelect
              id="identity-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as IdentityDocumentType | "")}
            >
              <option value="">Choisir…</option>
              {Object.entries(IDENTITY_DOCUMENT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="identity-number">Numéro de la pièce</Label>
            <Input
              id="identity-number"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="identity-verified" checked={verified} onCheckedChange={(v) => setVerified(v === true)} />
            <Label htmlFor="identity-verified" className="text-lg">
              Identité vérifiée : la pièce correspond au candidat
            </Label>
          </div>
          {message ? (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" size="lg">
            Valider l&apos;identité
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function StartStep({ test, onChanged }: { test: OfflineTest; onChanged: () => void }) {
  async function start() {
    const startedAt = new Date().toISOString();
    await testerDb().tests.update(test.id, { startedAt });
    await enqueue({ kind: "start", testId: test.id, startedAt });
    onChanged();
  }
  const identity = test.identity!;
  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Démarrage de l&apos;épreuve</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-lg">
          Identité contrôlée ({IDENTITY_DOCUMENT_TYPES[identity.documentType]} n° {identity.documentNumber}) le{" "}
          {new Date(identity.verifiedAt).toLocaleString("fr-FR")}.
        </p>
        <p>
          Grille : {test.grid.name} · {test.grid.items.length} critères · minimum {test.grid.passScore}/100
          {test.category.durationMinutes ? ` · durée prévue ${test.category.durationMinutes} min` : ""}
        </p>
        <Button size="xl" onClick={start}>
          Démarrer l&apos;épreuve
        </Button>
      </CardContent>
    </Card>
  );
}

function ScorePanel({ outcome, passScore }: { outcome: PracticalOutcome; passScore: number }) {
  const tone =
    outcome.status === "failed" ? "destructive" : outcome.status === "passed" ? "success" : "outline";
  const barColor = outcome.status === "failed" ? "bg-destructive" : "bg-success";
  return (
    <div className="grid min-w-64 flex-1 gap-2" aria-label="Score en direct">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-5xl leading-none font-bold tabular-nums">{outcome.score}/100</span>
        <Badge variant={tone}>
          {outcome.status === "passed" ? "Réussi" : outcome.status === "failed" ? "Échoué" : "En cours"}
        </Badge>
      </div>
      <div className="relative h-3 rounded-full bg-secondary" aria-hidden="true">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${Math.min(100, Math.max(0, outcome.score))}%` }} />
        <div className="absolute -top-1 h-5 w-0.5 rounded bg-foreground" style={{ left: `${passScore}%` }} />
      </div>
      <span className="text-sm text-muted-foreground">
        {outcome.points} / {outcome.maxPoints} points · minimum {passScore}/100
      </span>
    </div>
  );
}

const STEPS = ["Identité", "Démarrage", "Grille", "Signature"] as const;

function Stepper({ current }: { current: number }) {
  return (
    <ol aria-label="Étapes de l'épreuve" className="flex flex-wrap items-center gap-2">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-base font-semibold",
              active ? "bg-primary text-primary-foreground" : done ? "text-success" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-sm font-bold",
                done ? "bg-success text-success-foreground" : active ? "bg-yellow text-yellow-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function CriterionRow({
  item,
  mark,
  next,
  onMark,
}: {
  item: OfflineGridItem;
  mark: LocalMark | undefined;
  next: boolean;
  onMark: (mark: LocalMark | null) => void;
}) {
  const inputId = `item-${item.id}`;
  const [draft, setDraft] = useState(mark ? String(mark.points) : "");
  const [error, setError] = useState<string | null>(null);

  function commit(value: string) {
    setDraft(value);
    if (value.trim() === "") {
      setError(null);
      onMark(mark?.eliminatoryFault ? { points: 0, eliminatoryFault: true } : null);
      return;
    }
    const points = Number(value.replace(",", "."));
    if (!Number.isFinite(points) || points < 0 || points > item.maxPoints) {
      setError(`Entre 0 et ${item.maxPoints} points.`);
      return;
    }
    setError(null);
    onMark({ points, eliminatoryFault: mark?.eliminatoryFault ?? false });
  }

  function setFault(fault: boolean) {
    const points = fault ? 0 : mark?.points ?? item.maxPoints;
    setDraft(item.maxPoints > 0 ? String(points) : "");
    onMark({ points, eliminatoryFault: fault });
  }

  return (
    <li
      aria-label={item.label}
      className={cn(
        "grid gap-3 rounded-xl border-2 bg-card p-4",
        mark?.eliminatoryFault
          ? "border-destructive"
          : mark
            ? "border-success"
            : next
              ? "border-yellow ring-4 ring-yellow/40"
              : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">
            {mark && !mark.eliminatoryFault ? <Check className="mr-1 inline size-5 text-success" aria-hidden="true" /> : null}
            {item.position}. {item.label}
          </p>
          {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
        </div>
        {item.eliminatory ? <Badge variant="destructive">Éliminatoire</Badge> : null}
      </div>

      {item.eliminatory ? (
        <div className="flex flex-wrap gap-3" role="group" aria-label={`Résultat : ${item.label}`}>
          <Button
            type="button"
            size="lg"
            variant={mark && !mark.eliminatoryFault ? "success" : "outline"}
            aria-pressed={Boolean(mark && !mark.eliminatoryFault)}
            onClick={() => setFault(false)}
          >
            Satisfait
          </Button>
          <Button
            type="button"
            size="lg"
            variant={mark?.eliminatoryFault ? "destructive" : "outline"}
            aria-pressed={Boolean(mark?.eliminatoryFault)}
            onClick={() => setFault(true)}
          >
            Faute éliminatoire
          </Button>
        </div>
      ) : null}

      {item.maxPoints > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor={inputId}>Points (sur {item.maxPoints})</Label>
          <Input
            id={inputId}
            inputMode="decimal"
            className="w-28 text-xl"
            value={draft}
            disabled={mark?.eliminatoryFault}
            aria-invalid={Boolean(error)}
            onChange={(e) => commit(e.target.value)}
          />
          <Button type="button" variant="outline" onClick={() => commit("0")} disabled={mark?.eliminatoryFault}>
            0
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => commit(String(item.maxPoints))}
            disabled={mark?.eliminatoryFault}
          >
            Maximum
          </Button>
          {error ? <p className="w-full font-semibold text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

function GridStep({ test, onFinish }: { test: OfflineTest; onFinish: () => void }) {
  const outcome = outcomeOf(test);
  const nextId = test.grid.items.find((item) => !test.marks[item.id])?.id;

  async function mark(itemId: string, value: LocalMark | null) {
    const db = testerDb();
    await db.transaction("rw", db.tests, async () => {
      const current = await db.tests.get(test.id);
      if (!current || current.conclusion) return;
      const marks = { ...current.marks };
      if (value) marks[itemId] = value;
      else delete marks[itemId];
      await db.tests.update(test.id, { marks });
    });
  }

  return (
    <div className="grid gap-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-md">
        <ScorePanel outcome={outcome} passScore={test.grid.passScore} />
        <Stopwatch startedAt={test.startedAt!} plannedMinutes={test.category.durationMinutes} />
      </div>
      <ol className="grid gap-3">
        {test.grid.items.map((item) => (
          <CriterionRow
            key={item.id}
            item={item}
            mark={test.marks[item.id]}
            next={item.id === nextId}
            onMark={(value) => void mark(item.id, value)}
          />
        ))}
      </ol>
      {outcome.status === "incomplete" ? (
        <p className="text-lg">{outcome.reasons.join(" · ")}</p>
      ) : null}
      <Button size="xl" onClick={onFinish} disabled={outcome.status === "incomplete"}>
        Terminer l&apos;épreuve
      </Button>
    </div>
  );
}

function ConcludeStep({
  test,
  onBack,
  onChanged,
}: {
  test: OfflineTest;
  onBack: () => void;
  onChanged: () => void;
}) {
  const outcome = outcomeOf(test);
  const [signature, setSignature] = useState<Blob | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const status = outcome.status;

  async function sign() {
    if (status === "incomplete") return;
    if (!signature) {
      setMessage("Votre signature est obligatoire pour clôturer l'épreuve.");
      return;
    }
    const now = new Date();
    const conclusion = {
      status,
      score: outcome.score,
      endedAt: now.toISOString(),
      durationSeconds: Math.round((now.getTime() - new Date(test.startedAt!).getTime()) / 1000),
      signedAt: now.toISOString(),
    };
    await testerDb().tests.update(test.id, { conclusion });
    await enqueue({
      kind: "conclude",
      testId: test.id,
      organizationId: test.organizationId,
      marks: Object.entries(test.marks).map(([gridItemId, mark]) => ({ gridItemId, ...mark })),
      conclusion,
      signature,
    });
    onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Résultat et signature</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <ResultBanner status={status === "passed" ? "passed" : "failed"} score={outcome.score} reasons={outcome.reasons} />
        <p>Après signature, la grille ne peut plus être modifiée.</p>
        <SignaturePad label="Signature du testeur" onChange={setSignature} />
        {message ? (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="lg" onClick={onBack}>
            Revenir à la grille
          </Button>
          <Button size="lg" onClick={sign}>
            Signer et clôturer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultBanner({ status, score, reasons }: { status: "passed" | "failed"; score: number; reasons: string[] }) {
  return (
    <Alert variant={status === "passed" ? "success" : "destructive"}>
      <AlertTitle className="text-2xl">
        {status === "passed" ? "Épreuve réussie" : "Épreuve échouée"} · {score}/100
      </AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-5">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function DoneView({ test, pendingSync }: { test: OfflineTest; pendingSync: boolean }) {
  const status = test.conclusion?.status ?? (test.serverStatus === "passed" ? "passed" : "failed");
  const score = test.conclusion?.score ?? test.serverScore ?? 0;
  const reasons = Object.keys(test.marks).length ? outcomeOf(test).reasons : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Épreuve signée</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ResultBanner status={status} score={score} reasons={reasons} />
        {test.conclusion ? (
          <p>
            Durée : {formatDuration(test.conclusion.durationSeconds)} · signée le{" "}
            {new Date(test.conclusion.signedAt).toLocaleString("fr-FR")}
          </p>
        ) : null}
        <p className="text-lg font-semibold">
          {pendingSync
            ? "En attente d'envoi : le résultat partira dès le retour du réseau."
            : "Résultat envoyé au bureau."}
        </p>
      </CardContent>
    </Card>
  );
}

export function TestView({
  test,
  pendingSync,
  onBack,
  onChanged,
}: {
  test: OfflineTest;
  pendingSync: boolean;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [finishing, setFinishing] = useState(false);

  let body: React.ReactNode;
  let step: number;
  if (test.conclusion || test.serverSigned) {
    body = <DoneView test={test} pendingSync={pendingSync} />;
    step = STEPS.length;
  } else if (!test.identity) {
    body = <IdentityStep test={test} onChanged={onChanged} />;
    step = 0;
  } else if (!test.startedAt) {
    body = <StartStep test={test} onChanged={onChanged} />;
    step = 1;
  } else if (finishing) {
    body = <ConcludeStep test={test} onBack={() => setFinishing(false)} onChanged={onChanged} />;
    step = 3;
  } else {
    body = <GridStep test={test} onFinish={() => setFinishing(true)} />;
    step = 2;
  }

  return (
    <div className="grid gap-4">
      <div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden /> Candidats du jour
        </Button>
      </div>
      <Stepper current={step} />
      <Header test={test} />
      {body}
    </div>
  );
}
