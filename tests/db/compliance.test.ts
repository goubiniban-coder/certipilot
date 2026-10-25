import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addMember,
  asAnon,
  asUser,
  categoryId,
  createOrganization,
  errorHint,
  pool,
  type Db,
} from "./helpers";

/**
 * Full path of a practical test on the database side: assignment checks,
 * identity check, grid entry, signature, certificate issue and revocation.
 */

let org: Awaited<ReturnType<typeof createOrganization>>;
let testerUser: { id: string };
let ids: { [key: string]: string | undefined };

async function one<T = { [key: string]: string }>(db: Db, sql: string, params: unknown[] = []) {
  const { rows } = await db.query(sql, params);
  return rows[0] as T;
}

beforeAll(async () => {
  org = await createOrganization("OTC Conformité");
  testerUser = await addMember(org.orgId, "tester");
  const r489_3 = await categoryId(org.orgId, "R.489", "3");

  ids = await asUser(org.adminId, async (db) => {
    const o = org.orgId;
    const grid = await one(db, `select id from public.grids where category_id = $1`, [r489_3]);
    const tester = await one(
      db,
      `insert into public.testers (organization_id, profile_id, full_name) values ($1, $2, 'Marc Testeur') returning id`,
      [o, testerUser.id],
    );
    const otherTester = await one(
      db,
      `insert into public.testers (organization_id, full_name) values ($1, 'Julie Testeuse') returning id`,
      [o],
    );
    for (const t of [tester.id, otherTester.id]) {
      await db.query(
        `insert into public.tester_qualifications (organization_id, tester_id, category_id) values ($1, $2, $3)`,
        [o, t, r489_3],
      );
    }
    await db.query(
      `insert into public.tester_personal_caces (organization_id, tester_id, category_id, certificate_number, issuer_name, issuer_siret, expires_on)
       values ($1, $2, $3, 'EXT-1', 'Autre OTC', '98765432100019', current_date + 365),
              ($1, $4, $3, 'OWN-1', 'Nous-mêmes', $5, current_date + 365)`,
      [o, tester.id, r489_3, otherTester.id, org.siret],
    );
    const okForklift = await one(
      db,
      `insert into public.equipment (organization_id, category_id, name, serial_number, last_inspection_on)
       values ($1, $2, 'Chariot', 'OK-1', current_date - 30) returning id`,
      [o, r489_3],
    );
    const oldForklift = await one(
      db,
      `insert into public.equipment (organization_id, category_id, name, serial_number, last_inspection_on)
       values ($1, $2, 'Vieux chariot', 'OLD-1', current_date - 400) returning id`,
      [o, r489_3],
    );
    const session = await one(
      db,
      `insert into public.sessions (organization_id, name, starts_on, ends_on, location)
       values ($1, 'Session', current_date, current_date, 'Site') returning id`,
      [o],
    );
    for (const t of [tester.id, otherTester.id]) {
      await db.query(
        `insert into public.session_testers (organization_id, session_id, tester_id) values ($1, $2, $3)`,
        [o, session.id, t],
      );
    }
    for (const e of [okForklift.id, oldForklift.id]) {
      await db.query(
        `insert into public.session_equipment (organization_id, session_id, equipment_id) values ($1, $2, $3)`,
        [o, session.id, e],
      );
    }
    const trainee = await one(
      db,
      `insert into public.candidates (organization_id, last_name, first_name, birth_date, trainer_tester_id)
       values ($1, 'Bernard', 'Paul', '1988-11-03', $2) returning id`,
      [o, tester.id],
    );
    const candidate = await one(
      db,
      `insert into public.candidates (organization_id, last_name, first_name, birth_date)
       values ($1, 'Martin', 'Lucas', '1995-04-12') returning id`,
      [o],
    );
    const traineeSc = await one(
      db,
      `insert into public.session_candidates (organization_id, session_id, candidate_id) values ($1, $2, $3) returning id`,
      [o, session.id, trainee.id],
    );
    const sc = await one(
      db,
      `insert into public.session_candidates (organization_id, session_id, candidate_id) values ($1, $2, $3) returning id`,
      [o, session.id, candidate.id],
    );
    const recommendation = await one(
      db,
      `select id from public.recommendations where code = 'R.489'`,
    );
    return {
      r489_3,
      grid: grid.id,
      tester: tester.id,
      otherTester: otherTester.id,
      okForklift: okForklift.id,
      oldForklift: oldForklift.id,
      session: session.id,
      traineeSc: traineeSc.id,
      sc: sc.id,
      recommendation: recommendation.id,
    };
  });
});

afterAll(async () => {
  await pool.end();
});

function insertTest(sc: string, tester: string, equipment: string) {
  return asUser(org.adminId, (db) =>
    one(
      db,
      `insert into public.practical_tests (organization_id, session_candidate_id, category_id, grid_id, tester_id, equipment_id, test_date)
       values ($1, $2, $3, $4, $5, $6, current_date) returning id`,
      [org.orgId, sc, ids.r489_3, ids.grid, tester, equipment],
    ),
  );
}

describe("contrôles d'affectation", () => {
  it("bloque le testeur qui a formé le candidat", async () => {
    const hint = await errorHint(insertTest(ids.traineeSc!, ids.tester!, ids.okForklift!));
    expect(hint).toBe("TRAINER_CONFLICT");
  });

  it("explique le blocage en français", async () => {
    await expect(insertTest(ids.traineeSc!, ids.tester!, ids.okForklift!)).rejects.toThrow(
      "Marc Testeur a formé Paul Bernard : un testeur ne peut pas évaluer un candidat qu'il a formé.",
    );
  });

  it("bloque un testeur dont le CACES® vient de l'organisme lui-même", async () => {
    expect(await errorHint(insertTest(ids.sc!, ids.otherTester!, ids.okForklift!))).toBe(
      "TESTER_CACES_INVALID",
    );
  });

  it("bloque un engin dont la vérification a plus d'un an", async () => {
    expect(await errorHint(insertTest(ids.sc!, ids.tester!, ids.oldForklift!))).toBe(
      "EQUIPMENT_INSPECTION_INVALID",
    );
  });
});

describe("parcours complet jusqu'au certificat", () => {
  let testId: string;
  let certificateId: string;

  it("crée l'épreuve quand tout est conforme", async () => {
    const row = await insertTest(ids.sc!, ids.tester!, ids.okForklift!);
    testId = row.id!;
    expect(testId).toBeTruthy();
  });

  it("refuse de démarrer sans contrôle d'identité", async () => {
    const hint = await errorHint(
      asUser(testerUser.id, (db) =>
        db.query(`update public.practical_tests set started_at = now() where id = $1`, [testId]),
      ),
    );
    expect(hint).toBe("IDENTITY_NOT_VERIFIED");
  });

  it("le testeur contrôle l'identité, saisit la grille et signe", async () => {
    await asUser(testerUser.id, async (db) => {
      const updated = await db.query(
        `update public.session_candidates
         set identity_document_type = 'cni', identity_document_number = 'X123', identity_verified = true,
             identity_verified_at = now(), identity_verified_by = auth.uid()
         where id = $1`,
        [ids.sc],
      );
      expect(updated.rowCount).toBe(1);
      await db.query(`update public.practical_tests set started_at = now() where id = $1`, [testId]);
      await db.query(
        `insert into public.practical_results (organization_id, practical_test_id, grid_item_id, points)
         select $1, $2, gi.id, gi.max_points * 0.8 from public.grid_items gi where gi.grid_id = $3`,
        [org.orgId, testId, ids.grid],
      );
    });

    // Declaring a result that contradicts the grid is refused.
    expect(
      await errorHint(
        asUser(testerUser.id, (db) =>
          db.query(
            `update public.practical_tests set status = 'failed', signed_at = now(),
               tester_signature_path = 'sig.png', ended_at = now() where id = $1`,
            [testId],
          ),
        ),
      ),
    ).toBe("PRACTICAL_OUTCOME_MISMATCH");

    const test = await asUser(testerUser.id, (db) =>
      one(
        db,
        `update public.practical_tests set status = 'passed', signed_at = now(),
           tester_signature_path = 'sig.png', ended_at = now(), duration_seconds = 1500
         where id = $1 returning status, score::text`,
        [testId],
      ),
    );
    expect(test).toEqual({ status: "passed", score: "80.00" });
  });

  it("une épreuve signée ne se modifie plus", async () => {
    expect(
      await errorHint(
        asUser(org.adminId, (db) =>
          db.query(`update public.practical_tests set duration_seconds = 1 where id = $1`, [testId]),
        ),
      ),
    ).toBe("PRACTICAL_TEST_LOCKED");
    expect(
      await errorHint(
        asUser(testerUser.id, (db) =>
          db.query(`update public.practical_results set points = 0 where practical_test_id = $1`, [testId]),
        ),
      ),
    ).toBe("PRACTICAL_TEST_LOCKED");
  });

  it("refuse le certificat tant que la théorie n'est pas réussie", async () => {
    expect(
      await errorHint(
        asUser(org.adminId, (db) =>
          db.query(`select public.issue_certificate($1, $2)`, [ids.sc, ids.recommendation]),
        ),
      ),
    ).toBe("THEORY_NOT_PASSED");
    // 27/40 = 67.5 %: below the 70 % pass mark of the referential.
    const theory = await asUser(org.adminId, (db) =>
      one(
        db,
        `insert into public.theory_results (organization_id, session_candidate_id, recommendation_id, kind, score, max_score, passed)
         values ($1, $2, $3, 'qcm', 27, 40, true) returning passed`,
        [org.orgId, ids.sc, ids.recommendation],
      ),
    );
    expect(theory).toEqual({ passed: false });
  });

  it("émet le certificat avec les catégories obtenues et 5 ans de validité", async () => {
    await asUser(org.adminId, (db) =>
      db.query(`update public.theory_results set score = 32 where session_candidate_id = $1`, [ids.sc]),
    );
    const cert = await asUser(org.adminId, async (db) => {
      const { id } = await one(db, `select public.issue_certificate($1, $2) as id`, [
        ids.sc,
        ids.recommendation,
      ]);
      return one(
        db,
        `select c.id, c.number, (c.expires_on - c.issued_on)::text as days, c.issued_on::text, c.expires_on::text,
                (select string_agg(category_code, ',') from public.certificate_categories where certificate_id = c.id) as categories
         from public.certificates c where c.id = $1`,
        [id],
      );
    });
    certificateId = cert.id!;
    expect(cert.number).toMatch(/^T[A-Z0-9]+-\d{4}-000001$/);
    expect(cert.categories).toBe("3");
    expect(Number(cert.expires_on!.slice(0, 4)) - Number(cert.issued_on!.slice(0, 4))).toBe(5);

    // Issuing twice returns the same certificate (safe to replay after a sync).
    const again = await asUser(org.adminId, (db) =>
      one(db, `select public.issue_certificate($1, $2) as id`, [ids.sc, ids.recommendation]),
    );
    expect(again.id).toBe(certificateId);
  });

  it("un certificat émis ne se modifie ni ne se supprime", async () => {
    // Even the database owner is stopped by the trigger.
    expect(
      await errorHint(
        pool.query(`update public.certificates set expires_on = expires_on + 365 where id = $1`, [
          certificateId,
        ]),
      ),
    ).toBe("CERTIFICATE_IMMUTABLE");
    expect(
      await errorHint(pool.query(`delete from public.certificates where id = $1`, [certificateId])),
    ).toBe("CERTIFICATE_IMMUTABLE");
  });

  it("la page publique affiche le statut sans autres données personnelles", async () => {
    const { rows } = await pool.query(
      `select verification_token from public.certificates where id = $1`,
      [certificateId],
    );
    const token = rows[0].verification_token as string;
    const result = await asAnon((db) =>
      one<Record<string, unknown>>(db, `select * from public.verify_certificate($1)`, [token]),
    );
    expect(Object.keys(result).sort()).toEqual(
      [
        "categories",
        "expires_on",
        "holder_name",
        "issued_on",
        "number",
        "organization_name",
        "recommendation_code",
        "recommendation_label",
        "status",
      ].sort(),
    );
    expect(result.status).toBe("valid");
    expect(result.holder_name).toBe("Lucas MARTIN");
    const none = await asAnon((db) =>
      db.query(`select * from public.verify_certificate('jeton-inexistant-0000000000')`),
    );
    expect(none.rowCount).toBe(0);
  });

  it("seul l'admin révoque, avec un motif, une seule fois", async () => {
    expect(
      await errorHint(
        asUser(testerUser.id, (db) =>
          db.query(`select public.revoke_certificate($1, 'Fraude constatée')`, [certificateId]),
        ),
      ),
    ).toBe("FORBIDDEN");
    expect(
      await errorHint(
        asUser(org.adminId, (db) => db.query(`select public.revoke_certificate($1, '')`, [certificateId])),
      ),
    ).toBe("REASON_REQUIRED");

    await asUser(org.adminId, (db) =>
      db.query(`select public.revoke_certificate($1, 'Erreur d''identité constatée')`, [certificateId]),
    );
    const { rows } = await pool.query(
      `select verification_token from public.certificates where id = $1`,
      [certificateId],
    );
    const status = await asAnon((db) =>
      one(db, `select status from public.verify_certificate($1)`, [rows[0].verification_token]),
    );
    expect(status.status).toBe("revoked");

    expect(
      await errorHint(
        asUser(org.adminId, (db) =>
          db.query(`select public.revoke_certificate($1, 'Deuxième motif')`, [certificateId]),
        ),
      ),
    ).toBe("NOT_FOUND");
  });

  it("tout est tracé dans le journal d'audit, qui ne se modifie pas", async () => {
    const { rows } = await pool.query(
      `select table_name, action, count(*)::int as n from public.audit_log
       where organization_id = $1 group by 1, 2`,
      [org.orgId],
    );
    const has = (table: string, action: string) =>
      rows.some((r) => r.table_name === table && r.action === action);
    expect(has("practical_tests", "update")).toBe(true);
    expect(has("practical_results", "insert")).toBe(true);
    expect(has("certificates", "insert")).toBe(true);
    expect(has("certificates", "update")).toBe(true);
    expect(has("session_candidates", "update")).toBe(true);

    const actor = await pool.query(
      `select actor_id from public.audit_log where organization_id = $1 and table_name = 'certificates' and action = 'update'`,
      [org.orgId],
    );
    expect(actor.rows[0]?.actor_id).toBe(org.adminId);

    expect(await errorHint(pool.query(`delete from public.audit_log where organization_id = $1`, [org.orgId]))).toBe(
      "AUDIT_LOG_IMMUTABLE",
    );
  });
});

describe("versions des grilles", () => {
  it("une grille déjà utilisée ne se modifie plus : on crée une nouvelle version", async () => {
    const items = JSON.stringify([{ label: "Critère", maxPoints: 100, eliminatory: false }]);
    expect(
      await errorHint(
        asUser(org.adminId, (db) =>
          db.query(`select public.save_grid($1, 'Grille', 70, $2::jsonb)`, [ids.grid, items]),
        ),
      ),
    ).toBe("GRID_IN_USE");

    const version = await asUser(org.adminId, async (db) => {
      const { id } = await one(db, `select public.new_grid_version($1) as id`, [ids.grid]);
      await db.query(`select public.save_grid($1, 'Grille v2', 75, $2::jsonb)`, [id, items]);
      return one(
        db,
        `select g.version::text, g.is_active::text, (select count(*)::text from public.grid_items where grid_id = g.id) as items,
                (select is_active::text from public.grids where id = $2) as old_active
         from public.grids g where g.id = $1`,
        [id, ids.grid],
      );
    });
    expect(version).toEqual({ version: "2", is_active: "true", items: "1", old_active: "false" });
  });
});
