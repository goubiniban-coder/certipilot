import type { LocalIdentity, LocalMark, OfflineTest } from "./db";
import type { IdentityDocumentType } from "@/lib/rules";

/** A practical test as downloaded from Supabase (see lib/offline/sync.ts). */
export interface ServerTest {
  id: string;
  organization_id: string;
  tester_id: string;
  test_date: string;
  status: OfflineTest["serverStatus"];
  score: number | string | null;
  started_at: string | null;
  signed_at: string | null;
  session_candidate_id: string;
  session_candidates: {
    session_id: string;
    identity_verified: boolean;
    identity_document_type: IdentityDocumentType | null;
    identity_document_number: string | null;
    identity_verified_at: string | null;
    sessions: { name: string; location: string | null };
    candidates: { first_name: string; last_name: string; birth_date: string; photo_path: string | null };
  };
  categories: {
    code: string;
    label: string;
    practical_duration_minutes: number | null;
    recommendations: { code: string };
  };
  grids: {
    id: string;
    name: string;
    pass_score: number | string;
    grid_items: {
      id: string;
      position: number;
      label: string;
      description: string | null;
      max_points: number | string;
      eliminatory: boolean;
    }[];
  };
  equipment: { name: string; serial_number: string } | null;
  practical_results: { grid_item_id: string; points: number | string; eliminatory_fault: boolean }[];
}

/** True when the tablet holds work on this test that the server may not have yet. */
export function hasLocalWork(test: OfflineTest): boolean {
  return (
    test.identity !== null ||
    test.startedAt !== null ||
    Object.keys(test.marks).length > 0 ||
    test.conclusion !== null
  );
}

function serverIdentity(server: ServerTest): LocalIdentity | null {
  const sc = server.session_candidates;
  if (!sc.identity_verified || !sc.identity_document_type || !sc.identity_verified_at) return null;
  return {
    documentType: sc.identity_document_type,
    documentNumber: sc.identity_document_number ?? "",
    verifiedAt: sc.identity_verified_at,
  };
}

function serverMarks(server: ServerTest): Record<string, LocalMark> {
  return Object.fromEntries(
    server.practical_results.map((r) => [
      r.grid_item_id,
      { points: Number(r.points), eliminatoryFault: r.eliminatory_fault },
    ]),
  );
}

/**
 * Builds the local record from the server row. Work started on the tablet is
 * kept (the sync queue will send it); once the server has the signed test,
 * the server's version wins.
 */
export function mergeTest(
  local: OfflineTest | undefined,
  server: ServerTest,
  photo: Blob | null,
  now: string,
): OfflineTest {
  const sc = server.session_candidates;
  const signed = server.signed_at !== null;
  const keepLocal = local !== undefined && !signed && hasLocalWork(local);

  return {
    id: server.id,
    organizationId: server.organization_id,
    testerId: server.tester_id,
    testDate: server.test_date,
    sessionId: sc.session_id,
    sessionName: sc.sessions.name,
    sessionLocation: sc.sessions.location,
    sessionCandidateId: server.session_candidate_id,
    candidate: {
      firstName: sc.candidates.first_name,
      lastName: sc.candidates.last_name,
      birthDate: sc.candidates.birth_date,
      photo: photo ?? local?.candidate.photo ?? null,
    },
    category: {
      code: server.categories.code,
      label: server.categories.label,
      recommendationCode: server.categories.recommendations.code,
      durationMinutes: server.categories.practical_duration_minutes,
    },
    equipment: server.equipment
      ? { name: server.equipment.name, serialNumber: server.equipment.serial_number }
      : null,
    grid: {
      id: server.grids.id,
      name: server.grids.name,
      passScore: Number(server.grids.pass_score),
      items: [...server.grids.grid_items]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          position: item.position,
          label: item.label,
          description: item.description,
          maxPoints: Number(item.max_points),
          eliminatory: item.eliminatory,
        })),
    },
    serverStatus: server.status,
    serverScore: server.score === null ? null : Number(server.score),
    serverSigned: signed,
    identity: keepLocal ? local.identity : serverIdentity(server),
    startedAt: keepLocal ? local.startedAt : server.started_at,
    marks: keepLocal ? local.marks : serverMarks(server),
    conclusion: keepLocal ? local.conclusion : null,
    downloadedAt: now,
  };
}
