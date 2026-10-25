"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
}

/** Elapsed time since the test started, compared with the planned duration. */
export function Stopwatch({ startedAt, plannedMinutes }: { startedAt: string; plannedMinutes: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const elapsed = (now - new Date(startedAt).getTime()) / 1000;
  const over = plannedMinutes !== null && elapsed > plannedMinutes * 60;
  return (
    <div
      aria-label="Chronomètre"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border-2 px-3 py-1 font-mono text-2xl font-bold tabular-nums",
        over ? "border-warning text-warning" : "border-input",
      )}
    >
      <Timer className="size-6" aria-hidden />
      {formatDuration(elapsed)}
      {plannedMinutes !== null ? (
        <span className="font-sans text-sm font-normal text-muted-foreground">/ {plannedMinutes} min prévues</span>
      ) : null}
    </div>
  );
}
