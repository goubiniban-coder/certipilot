import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addMember,
  asAnon,
  asUser,
  categoryId,
  createOrganization,
  errorHint,
  pool,
} from "./helpers";

const TENANT_TABLES = [
  "profiles",
  "invitations",
  "recommendations",
  "categories",
  "grids",
  "grid_items",
  "testers",
  "tester_qualifications",
  "tester_personal_caces",
  "equipment",
  "client_companies",
  "candidates",
  "sessions",
  "session_testers",
  "session_equipment",
  "session_candidates",
  "theory_results",
  "practical_tests",
  "practical_results",
  "certificates",
  "certificate_categories",
  "audit_log",
];

let a: Awaited<ReturnType<typeof createOrganization>>;
let b: Awaited<ReturnType<typeof createOrganization>>;

beforeAll(async () => {
  a = await createOrganization("OTC Alpha");
  b = await createOrganization("OTC Bêta");

  for (const org of [a, b]) {
    await asUser(org.adminId, async (db) => {
      const { rows } = await db.query<{ id: string }>(
        `insert into public.client_companies (organization_id, name) values ($1, 'Client') returning id`,
        [org.orgId],
      );
      await db.query(
        `insert into public.candidates (organization_id, last_name, first_name, birth_date, client_company_id)
         values ($1, 'Durand', 'Léa', '1990-01-01', $2)`,
        [org.orgId, rows[0]!.id],
      );
      await db.query(
        `insert into public.sessions (organization_id, name, starts_on, ends_on, location)
         values ($1, 'Session', current_date, current_date, 'Site')`,
        [org.orgId],
      );
      await db.query(
        `insert into public.invitations (organization_id, email, full_name, role)
         values ($1, 'invite@example.test', 'Invité', 'secretariat')`,
        [org.orgId],
      );
    });
  }
});

afterAll(async () => {
  await pool.end();
});

describe("isolation entre organisations (RLS)", () => {
  it("chaque admin ne voit que les lignes de son organisation, table par table", async () => {
    for (const table of TENANT_TABLES) {
      const rows = await asUser(a.adminId, async (db) => {
        const { rows } = await db.query<{ organization_id: string }>(
          `select organization_id from public.${table}`,
        );
        return rows;
      });
      expect(
        rows.every((r) => r.organization_id === a.orgId),
        `fuite de données dans ${table}`,
      ).toBe(true);
    }
  });

  it("l'organisation voisine est invisible", async () => {
    const visible = await asUser(a.adminId, async (db) => {
      const { rows } = await db.query("select id from public.organizations");
      return rows.map((r) => r.id);
    });
    expect(visible).toEqual([a.orgId]);
  });

  it("on ne peut pas écrire dans une autre organisation", async () => {
    const hint = await errorHint(
      asUser(a.adminId, (db) =>
        db.query(
          `insert into public.client_companies (organization_id, name) values ($1, 'Intrus')`,
          [b.orgId],
        ),
      ),
    );
    expect(hint).toBe("42501");
  });

  it("on ne peut ni modifier ni supprimer les lignes d'une autre organisation", async () => {
    const result = await asUser(
      a.adminId,
      async (db) => {
        const updated = await db.query(
          `update public.candidates set last_name = 'Piraté' where organization_id = $1`,
          [b.orgId],
        );
        const deleted = await db.query(`delete from public.sessions where organization_id = $1`, [
          b.orgId,
        ]);
        return [updated.rowCount, deleted.rowCount];
      },
      false,
    );
    expect(result).toEqual([0, 0]);
    const { rows } = await pool.query(
      `select last_name from public.candidates where organization_id = $1`,
      [b.orgId],
    );
    expect(rows[0]?.last_name).toBe("Durand");
  });

  it("un visiteur anonyme n'a accès à aucune table", async () => {
    for (const table of ["candidates", "certificates", "organizations"]) {
      expect(await errorHint(asAnon((db) => db.query(`select * from public.${table}`)))).toBe(
        "42501",
      );
    }
  });

  it("un utilisateur sans profil ne voit rien", async () => {
    const { rows } = await pool.query("select gen_random_uuid() as id");
    const count = await asUser(rows[0].id, async (db) => {
      const r = await db.query("select count(*)::int as n from public.candidates");
      return r.rows[0].n;
    });
    expect(count).toBe(0);
  });
});

describe("droits par rôle", () => {
  it("le secrétariat ne modifie pas le référentiel, l'admin oui", async () => {
    const secretariat = await addMember(a.orgId, "secretariat");
    const updated = await asUser(
      secretariat.id,
      async (db) =>
        (await db.query(`update public.recommendations set validity_years = 7`)).rowCount,
      false,
    );
    expect(updated).toBe(0);

    const byAdmin = await asUser(
      a.adminId,
      async (db) =>
        (await db.query(`update public.recommendations set validity_years = 7 where code = 'R.489'`))
          .rowCount,
      false,
    );
    expect(byAdmin).toBe(1);
  });

  it("un testeur ne crée pas de candidat", async () => {
    const tester = await addMember(a.orgId, "tester");
    expect(
      await errorHint(
        asUser(tester.id, (db) =>
          db.query(
            `insert into public.candidates (organization_id, last_name, first_name, birth_date)
             values ($1, 'X', 'Y', '2000-01-01')`,
            [a.orgId],
          ),
        ),
      ),
    ).toBe("42501");
  });

  it("seul l'admin lit le journal d'audit et les invitations", async () => {
    const secretariat = await addMember(a.orgId, "secretariat");
    const counts = await asUser(secretariat.id, async (db) => [
      (await db.query("select count(*)::int as n from public.audit_log")).rows[0].n,
      (await db.query("select count(*)::int as n from public.invitations")).rows[0].n,
    ]);
    expect(counts).toEqual([0, 0]);
    const adminCount = await asUser(a.adminId, async (db) =>
      (await db.query("select count(*)::int as n from public.audit_log")).rows[0].n,
    );
    expect(adminCount).toBeGreaterThan(0);
  });

  it("le référentiel par défaut est copié à l'inscription, avec les durées paramétrables", async () => {
    const rows = await asUser(a.adminId, async (db) => {
      const r = await db.query(
        `select code, validity_years, requires_ipr from public.recommendations order by code`,
      );
      return r.rows;
    });
    expect(rows).toHaveLength(8);
    expect(rows.find((r) => r.code === "R.482")).toMatchObject({ validity_years: 10, requires_ipr: true });
    expect(rows.find((r) => r.code === "R.486")).toMatchObject({ validity_years: 5 });
    expect(await categoryId(a.orgId, "R.489", "3")).toBeTruthy();
  });
});

describe("Storage", () => {
  it("les fichiers sont rangés par organisation", async () => {
    await pool.query(
      `insert into storage.objects (bucket_id, name) values ('candidate-photos', $1), ('candidate-photos', $2)`,
      [`${a.orgId}/photo.jpg`, `${b.orgId}/photo.jpg`],
    );
    const names = await asUser(a.adminId, async (db) => {
      const r = await db.query(`select name from storage.objects where bucket_id = 'candidate-photos'`);
      return r.rows.map((row) => row.name as string);
    });
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((n) => n.startsWith(`${a.orgId}/`))).toBe(true);
  });

  it("aucun bucket n'est public", async () => {
    const { rows } = await pool.query(`select id from storage.buckets where public`);
    expect(rows).toEqual([]);
  });
});
