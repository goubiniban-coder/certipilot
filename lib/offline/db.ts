import Dexie, { type EntityTable } from "dexie";
import type { IdentityDocumentType } from "@/lib/rules";

/**
 * Local database of the tester app (IndexedDB through Dexie). It holds the
 * tests of the day downloaded while online, and a queue of changes made on
 * the tablet that are sent to Supabase, in order, once the network is back.
 */

export interface OfflineGridItem {
  id: string;
  position: number;
  label: string;
  description: string | null;
  maxPoints: number;
  eliminatory: boolean;
}

export interface LocalMark {
  points: number;
  eliminatoryFault: boolean;
}

export interface LocalIdentity {
  documentType: IdentityDocumentType;
  documentNumber: string;
  verifiedAt: string;
}

export type LocalConclusion = {
  status: "passed" | "failed";
  score: number;
  endedAt: string;
  durationSeconds: number;
  signedAt: string;
};

export interface OfflineTest {
  id: string;
  organizationId: string;
  testerId: string;
  testDate: string;
  sessionId: string;
  sessionName: string;
  sessionLocation: string | null;
  sessionCandidateId: string;
  candidate: {
    firstName: string;
    lastName: string;
    birthDate: string;
    photo: Blob | null;
  };
  category: {
    code: string;
    label: string;
    recommendationCode: string;
    durationMinutes: number | null;
  };
  equipment: { name: string; serialNumber: string } | null;
  grid: { id: string; name: string; passScore: number; items: OfflineGridItem[] };
  /** State as last seen on the server. */
  serverStatus: "pending" | "incomplete" | "passed" | "failed";
  serverScore: number | null;
  serverSigned: boolean;
  /** Work done on the tablet. */
  identity: LocalIdentity | null;
  startedAt: string | null;
  marks: Record<string, LocalMark>;
  conclusion: LocalConclusion | null;
  downloadedAt: string;
}

export type QueueOperation =
  | {
      kind: "identity";
      testId: string;
      sessionCandidateId: string;
      identity: LocalIdentity;
    }
  | { kind: "start"; testId: string; startedAt: string }
  | {
      kind: "conclude";
      testId: string;
      organizationId: string;
      marks: { gridItemId: string; points: number; eliminatoryFault: boolean }[];
      conclusion: LocalConclusion;
      signature: Blob;
    };

export interface QueueEntry {
  seq?: number;
  createdAt: string;
  operation: QueueOperation;
  /** Set when the server refused the change: it will not be retried automatically. */
  error: string | null;
}

export interface MetaEntry {
  key: string;
  value: string;
}

export type TesterDatabase = Dexie & {
  tests: EntityTable<OfflineTest, "id">;
  queue: EntityTable<QueueEntry, "seq">;
  meta: EntityTable<MetaEntry, "key">;
};

export const OFFLINE_DB_NAME = "certipilot-testeur";

let instance: TesterDatabase | null = null;

export function testerDb(): TesterDatabase {
  if (!instance) {
    instance = new Dexie(OFFLINE_DB_NAME) as TesterDatabase;
    instance.version(1).stores({
      tests: "id, testDate",
      queue: "++seq",
      meta: "key",
    });
  }
  return instance;
}

/** Wipes the local data, e.g. when another account signs in on the tablet. */
export async function clearTesterDb(): Promise<void> {
  const db = testerDb();
  await db.transaction("rw", db.tests, db.queue, db.meta, async () => {
    await Promise.all([db.tests.clear(), db.queue.clear(), db.meta.clear()]);
  });
}
