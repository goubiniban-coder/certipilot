"use client";

import { CloudOff, RefreshCw, TriangleAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncState } from "./use-sync";

const STATES: Record<SyncState, { label: string; className: string; Icon: typeof CloudOff }> = {
  offline: { label: "Hors ligne", className: "bg-warning text-warning-foreground", Icon: CloudOff },
  syncing: { label: "Synchronisation en cours", className: "bg-secondary text-secondary-foreground", Icon: RefreshCw },
  error: { label: "Erreur de synchronisation", className: "bg-destructive text-destructive-foreground", Icon: TriangleAlert },
  synced: { label: "Synchronisé", className: "bg-success text-success-foreground", Icon: CheckCircle2 },
};

export function SyncIndicator({ state, pending }: { state: SyncState; pending: number }) {
  const { label, className, Icon } = STATES[state];
  return (
    <div
      role="status"
      aria-live="polite"
      data-state={state}
      className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold", className)}
    >
      <Icon className={cn("size-5", state === "syncing" && "animate-spin")} aria-hidden />
      <span>{label}</span>
      {pending > 0 ? (
        <span className="font-normal">· {pending} modification{pending > 1 ? "s" : ""} en attente</span>
      ) : null}
    </div>
  );
}
