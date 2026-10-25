import type { SupabaseClient } from "@supabase/supabase-js";
import { dbErrorMessage, type DbError } from "@/lib/db-errors";
import { testerDb, type QueueEntry, type QueueOperation } from "./db";
import { mergeTest, type ServerTest } from "./merge";

const TEST_SELECT = `
  id, organization_id, tester_id, test_date, status, score, started_at, signed_at, session_candidate_id,
  session_candidates(session_id, identity_verified, identity_document_type, identity_document_number,
    identity_verified_at, sessions(name, location), candidates(first_name, last_name, birth_date, photo_path)),
  categories(code, label, practical_duration_minutes, recommendations(code)),
  grids(id, name, pass_score, grid_items(id, position, label, description, max_points, eliminatory)),
  equipment(name, serial_number),
  practical_results(grid_item_id, points, eliminatory_fault)`;

/** Raised when the network or the server is unreachable: the change is retried later. */
export class OfflineError extends Error {
  constructor(cause?: unknown) {
    super("Pas de connexion au serveur.", { cause });
    this.name = "OfflineError";
  }
}

/** Raised when the server refused a change: it is kept but not retried automatically. */
export class RejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejectedError";
  }
}

function isNetworkFailure(error: { message?: string; code?: string; name?: string }): boolean {
  if (error.name === "StorageUnknownError") return true;
  return !error.code && /fetch|network|load failed/i.test(error.message ?? "");
}

function fail(error: DbError & { name?: string }): never {
  // Network down, or an expired session the client refreshes on the next try.
  if (isNetworkFailure(error) || error.code?.startsWith("PGRST3")) throw new OfflineError(error);
  throw new RejectedError(dbErrorMessage(error));
}

/**
 * Downloads the tester's practical tests of the day, with grids and candidate
 * photos, so that the whole test can be run without network.
 */
export async function downloadTests(
  supabase: SupabaseClient,
  testerId: string,
  today: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("practical_tests")
    .select(TEST_SELECT)
    .eq("tester_id", testerId)
    .eq("test_date", today)
    .returns<ServerTest[]>();
  if (error) fail(error);

  const db = testerDb();
  const now = new Date().toISOString();
  const rows = data ?? [];
  const records = await Promise.all(
    rows.map(async (row) => {
      const local = await db.tests.get(row.id);
      const photoPath = row.session_candidates.candidates.photo_path;
      let photo: Blob | null = null;
      if (photoPath) {
        const { data: blob } = await supabase.storage.from("candidate-photos").download(photoPath);
        photo = blob ?? null;
      }
      return mergeTest(local, row, photo, now);
    }),
  );

  const pendingTestIds = new Set(
    (await db.queue.toArray()).map((entry) => entry.operation.testId),
  );
  const keepIds = new Set(rows.map((row) => row.id));
  await db.transaction("rw", db.tests, async () => {
    await db.tests.bulkPut(records);
    // Tests no longer assigned to this tester are dropped, unless unsent work remains.
    const stale = (await db.tests.toArray()).filter(
      (test) => !keepIds.has(test.id) && !pendingTestIds.has(test.id),
    );
    await db.tests.bulkDelete(stale.map((test) => test.id));
  });
  return records.length;
}

export async function enqueue(operation: QueueOperation): Promise<void> {
  await testerDb().queue.add({ createdAt: new Date().toISOString(), operation, error: null });
}

async function send(supabase: SupabaseClient, userId: string, operation: QueueOperation) {
  switch (operation.kind) {
    case "identity": {
      const { data, error } = await supabase
        .from("session_candidates")
        .update({
          identity_document_type: operation.identity.documentType,
          identity_document_number: operation.identity.documentNumber,
          identity_verified: true,
          identity_verified_at: operation.identity.verifiedAt,
          identity_verified_by: userId,
        })
        .eq("id", operation.sessionCandidateId)
        .select("id");
      if (error) fail(error);
      if (!data?.length) throw new RejectedError("Ce candidat ne fait plus partie de vos sessions.");
      return;
    }
    case "start": {
      const { data, error } = await supabase
        .from("practical_tests")
        .update({ started_at: operation.startedAt })
        .eq("id", operation.testId)
        .is("signed_at", null)
        .select("id");
      if (error) fail(error);
      if (!data?.length) throw new RejectedError("Cette épreuve ne vous est plus attribuée.");
      return;
    }
    case "conclude": {
      const { testId, organizationId, conclusion } = operation;
      if (operation.marks.length) {
        const { error } = await supabase.from("practical_results").upsert(
          operation.marks.map((mark) => ({
            organization_id: organizationId,
            practical_test_id: testId,
            grid_item_id: mark.gridItemId,
            points: mark.points,
            eliminatory_fault: mark.eliminatoryFault,
          })),
          { onConflict: "practical_test_id,grid_item_id" },
        );
        if (error) fail(error);
      }

      // One signature file per test; a retry after a lost answer finds it already there.
      const signaturePath = `${organizationId}/practical-tests/${testId}.png`;
      const upload = await supabase.storage
        .from("signatures")
        .upload(signaturePath, operation.signature, { contentType: "image/png", upsert: false });
      if (upload.error && !/exists|duplicate/i.test(upload.error.message)) {
        if (isNetworkFailure(upload.error)) throw new OfflineError(upload.error);
        throw new RejectedError("L'envoi de la signature a échoué.");
      }

      const { data, error } = await supabase
        .from("practical_tests")
        .update({
          status: conclusion.status,
          ended_at: conclusion.endedAt,
          duration_seconds: conclusion.durationSeconds,
          tester_signature_path: signaturePath,
          signed_at: conclusion.signedAt,
        })
        .eq("id", testId)
        .is("signed_at", null)
        .select("id, score");
      if (error) fail(error);
      if (!data?.length) {
        // Already signed: the earlier attempt went through.
        const { data: existing } = await supabase
          .from("practical_tests")
          .select("signed_at")
          .eq("id", testId)
          .maybeSingle();
        if (existing?.signed_at) return;
        throw new RejectedError("Cette épreuve ne vous est plus attribuée.");
      }
      return;
    }
  }
}

export interface QueueReport {
  sent: number;
  pending: number;
  rejected: QueueEntry[];
  offline: boolean;
}

/**
 * Sends the queued changes in order. A refused change stops the later changes
 * of the same test (they depend on it) but not those of other tests.
 */
export async function processQueue(supabase: SupabaseClient, userId: string): Promise<QueueReport> {
  const db = testerDb();
  const entries = await db.queue.orderBy("seq").toArray();
  const blockedTests = new Set<string>();
  let sent = 0;
  let offline = false;

  for (const entry of entries) {
    const { testId } = entry.operation;
    if (entry.error || blockedTests.has(testId)) {
      blockedTests.add(testId);
      continue;
    }
    try {
      await send(supabase, userId, entry.operation);
      await db.queue.delete(entry.seq!);
      sent += 1;
    } catch (error) {
      if (error instanceof RejectedError) {
        await db.queue.update(entry.seq!, { error: error.message });
        blockedTests.add(testId);
        continue;
      }
      console.warn("Synchronisation interrompue", error);
      offline = true;
      break;
    }
  }

  const remaining = await db.queue.toArray();
  return {
    sent,
    pending: remaining.length,
    rejected: remaining.filter((entry) => entry.error),
    offline,
  };
}

/** Lets the tester retry changes the server refused (after the back office fixed the cause). */
export async function retryRejected(): Promise<void> {
  await testerDb().queue.toCollection().modify({ error: null });
}
