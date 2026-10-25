"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toIsoDate } from "@/lib/rules";
import { clearTesterDb, testerDb } from "@/lib/offline/db";
import { downloadTests, OfflineError, processQueue } from "@/lib/offline/sync";
import { useLiveQuery } from "@/lib/offline/use-live-query";

export type SyncState = "offline" | "syncing" | "error" | "synced";

const RETRY_MS = 30_000;

/**
 * Keeps the tablet and the server in step: sends the queue, then downloads
 * the tests of the day. Runs on load, when the network comes back, every
 * 30 seconds and whenever `syncNow` is called after a local change.
 */
export function useSync(userId: string, testerId: string | null) {
  const supabase = useRef(createClient()).current;
  const [online, setOnline] = useState(true);
  const [reachable, setReachable] = useState(true);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const again = useRef(false);

  const queue = useLiveQuery(() => testerDb().queue.toArray(), []);

  const run = useCallback(async () => {
    if (!testerId) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setReachable(false);
      return;
    }
    setRunning(true);
    try {
      const report = await processQueue(supabase, userId);
      if (report.offline) throw new OfflineError();
      await downloadTests(supabase, testerId, toIsoDate(new Date()));
      setReachable(true);
      setLastSyncAt(new Date().toISOString());
      await testerDb().meta.put({ key: "lastSyncAt", value: new Date().toISOString() });
    } catch (error) {
      if (!(error instanceof OfflineError)) console.error(error);
      setReachable(false);
    } finally {
      setRunning(false);
    }
  }, [supabase, userId, testerId]);

  const syncNow = useCallback(async () => {
    if (inFlight.current) {
      again.current = true;
      return inFlight.current;
    }
    inFlight.current = (async () => {
      do {
        again.current = false;
        await run();
      } while (again.current);
    })().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, [run]);

  // Another account on this tablet: start from an empty local database.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = testerDb();
      const owner = await db.meta.get("userId");
      if (owner && owner.value !== userId) await clearTesterDb();
      await db.meta.put({ key: "userId", value: userId });
      const last = await db.meta.get("lastSyncAt");
      if (!cancelled) {
        setLastSyncAt(last?.value ?? null);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void syncNow();
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timer = window.setInterval(() => void syncNow(), RETRY_MS);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.clearInterval(timer);
    };
  }, [ready, syncNow]);

  const pending = queue?.length ?? 0;
  const rejected = queue?.filter((entry) => entry.error) ?? [];
  let state: SyncState;
  if (!online || !reachable) state = "offline";
  else if (rejected.length) state = "error";
  else if (running || pending > 0) state = "syncing";
  else state = "synced";

  return { state, pending, rejected, lastSyncAt, ready, syncNow };
}
