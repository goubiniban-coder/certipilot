import { describe, expect, it } from "vitest";
import { hasLocalWork, mergeTest, type ServerTest } from "@/lib/offline/merge";

function serverRow(overrides: Partial<ServerTest> = {}): ServerTest {
  return {
    id: "t1",
    organization_id: "o1",
    tester_id: "tester1",
    test_date: "2026-10-25",
    status: "pending",
    score: null,
    started_at: null,
    signed_at: null,
    session_candidate_id: "sc1",
    session_candidates: {
      session_id: "s1",
      identity_verified: false,
      identity_document_type: null,
      identity_document_number: null,
      identity_verified_at: null,
      sessions: { name: "Session", location: "Lille" },
      candidates: { first_name: "Lucas", last_name: "Martin", birth_date: "1995-04-12", photo_path: null },
    },
    categories: { code: "3", label: "Chariots", practical_duration_minutes: 45, recommendations: { code: "R.489" } },
    grids: {
      id: "g1",
      name: "Grille",
      pass_score: "70.00",
      grid_items: [
        { id: "i2", position: 2, label: "B", description: null, max_points: "10.00", eliminatory: false },
        { id: "i1", position: 1, label: "A", description: "a", max_points: "0", eliminatory: true },
      ],
    },
    equipment: { name: "Chariot", serial_number: "CF-0001" },
    practical_results: [],
    ...overrides,
  };
}

const NOW = "2026-10-25T08:00:00.000Z";

describe("mergeTest", () => {
  it("builds a fresh record from the server, items sorted and numbers parsed", () => {
    const test = mergeTest(undefined, serverRow(), null, NOW);
    expect(test.grid.items.map((i) => i.id)).toEqual(["i1", "i2"]);
    expect(test.grid.passScore).toBe(70);
    expect(test.grid.items[1]!.maxPoints).toBe(10);
    expect(test.equipment).toEqual({ name: "Chariot", serialNumber: "CF-0001" });
    expect(test.identity).toBeNull();
    expect(test.marks).toEqual({});
    expect(test.serverSigned).toBe(false);
    expect(hasLocalWork(test)).toBe(false);
  });

  it("takes identity, start and marks already on the server", () => {
    const row = serverRow({
      started_at: "2026-10-25T07:00:00Z",
      practical_results: [{ grid_item_id: "i2", points: "8.5", eliminatory_fault: false }],
      session_candidates: {
        ...serverRow().session_candidates,
        identity_verified: true,
        identity_document_type: "cni",
        identity_document_number: "X1",
        identity_verified_at: "2026-10-25T06:59:00Z",
      },
    });
    const test = mergeTest(undefined, row, null, NOW);
    expect(test.identity).toEqual({ documentType: "cni", documentNumber: "X1", verifiedAt: "2026-10-25T06:59:00Z" });
    expect(test.startedAt).toBe("2026-10-25T07:00:00Z");
    expect(test.marks).toEqual({ i2: { points: 8.5, eliminatoryFault: false } });
  });

  it("keeps the work done on the tablet and the last photo", () => {
    const photo = new Blob(["x"]);
    const local = {
      ...mergeTest(undefined, serverRow(), photo, NOW),
      identity: { documentType: "passport" as const, documentNumber: "P1", verifiedAt: NOW },
      startedAt: NOW,
      marks: { i1: { points: 0, eliminatoryFault: true } },
    };
    expect(hasLocalWork(local)).toBe(true);
    const merged = mergeTest(local, serverRow({ equipment: null }), null, NOW);
    expect(merged.identity).toEqual(local.identity);
    expect(merged.marks).toEqual(local.marks);
    expect(merged.startedAt).toBe(NOW);
    expect(merged.candidate.photo).toBe(photo);
    expect(merged.equipment).toBeNull();
  });

  it("lets the server win once the test is signed", () => {
    const local = { ...mergeTest(undefined, serverRow(), null, NOW), startedAt: NOW };
    const merged = mergeTest(
      local,
      serverRow({ status: "passed", score: "82.5", signed_at: NOW, started_at: "2026-10-25T07:00:00Z" }),
      null,
      NOW,
    );
    expect(merged.serverSigned).toBe(true);
    expect(merged.serverScore).toBe(82.5);
    expect(merged.startedAt).toBe("2026-10-25T07:00:00Z");
    expect(merged.conclusion).toBeNull();
  });

  it("treats unverified or partial server identity as missing", () => {
    const row = serverRow();
    row.session_candidates.identity_verified = true;
    expect(mergeTest(undefined, row, null, NOW).identity).toBeNull();
    row.session_candidates.identity_document_type = "cni";
    row.session_candidates.identity_verified_at = NOW;
    expect(mergeTest(undefined, row, null, NOW).identity?.documentNumber).toBe("");
  });
});
