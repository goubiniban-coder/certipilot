import { beforeAll, describe, expect, it } from "vitest";
import { addMember, asAnon, asUser, createAuthUser, createOrganization, errorHint, pool } from "./helpers";

let org: Awaited<ReturnType<typeof createOrganization>>;
let other: Awaited<ReturnType<typeof createOrganization>>;
let companyA: string;
let companyB: string;
let portalUser: { id: string; email: string };

async function company(orgId: string, name: string) {
  const { rows } = await pool.query<{ id: string }>(
    "insert into public.client_companies (organization_id, name) values ($1, $2) returning id",
    [orgId, name],
  );
  return rows[0]!.id;
}

async function certificate(orgId: string, companyId: string, last: string, expires: string, revoked = false) {
  const cand = await pool.query<{ id: string }>(
    `insert into public.candidates (organization_id, last_name, first_name, birth_date, client_company_id)
     values ($1, $2, 'Test', '1990-01-01', $3) returning id`,
    [orgId, last, companyId],
  );
  const sess = await pool.query<{ id: string }>(
    `insert into public.sessions (organization_id, name, starts_on, ends_on, location)
     values ($1, 'S', current_date, current_date, 'Site') returning id`,
    [orgId],
  );
  const rec = await pool.query<{ id: string; code: string; label: string }>(
    "select id, code, label from public.recommendations where organization_id = $1 and code = 'R.489'",
    [orgId],
  );
  await pool.query(
    `insert into public.certificates (organization_id, number, candidate_id, recommendation_id, session_id,
       holder_last_name, holder_first_name, holder_birth_date, recommendation_code, recommendation_label,
       issued_on, expires_on, revoked_at, revocation_reason)
     values ($1, $2, $3, $4, $5, $6, 'Test', '1990-01-01', $7, $8, $9::date - 1000, $9, $10, $11)`,
    [orgId, `N-${last}-${Math.random().toString(36).slice(2, 8)}`, cand.rows[0]!.id, rec.rows[0]!.id, sess.rows[0]!.id,
     last, rec.rows[0]!.code, rec.rows[0]!.label, expires, revoked ? new Date() : null, revoked ? "erreur" : null],
  );
}

beforeAll(async () => {
  org = await createOrganization("OTC Portail");
  other = await createOrganization("OTC Autre");
  companyA = await company(org.orgId, "Entreprise A");
  companyB = await company(org.orgId, "Entreprise B");
  await certificate(org.orgId, companyA, "Alpha", "2030-01-01");
  await certificate(org.orgId, companyA, "Revoquee", "2030-01-01", true);
  await certificate(org.orgId, companyB, "Bravo", "2030-01-01");
  portalUser = await createAuthUser();
});

describe("company portal", () => {
  it("a company contact accepts an invitation and sees only the certificates of their company", async () => {
    const secretary = await addMember(org.orgId, "secretariat");
    const token = await asUser(secretary.id, async (db) => {
      const { rows } = await db.query<{ token: string }>(
        `insert into public.company_invitations (organization_id, client_company_id, email, full_name)
         values ($1, $2, $3, 'Contact A') returning token`,
        [org.orgId, companyA, portalUser.email],
      );
      return rows[0]!.token;
    });

    const info = await asAnon(async (db) => (await db.query("select * from public.get_company_invitation($1)", [token])).rows[0]);
    expect(info).toMatchObject({ company_name: "Entreprise A", valid: true });

    await asUser(portalUser.id, (db) => db.query("select public.accept_company_invitation($1)", [token]));

    const rows = await asUser(portalUser.id, async (db) =>
      (await db.query<{ holder_name: string; status: string }>("select * from public.company_portal_certificates()")).rows,
    );
    expect(rows.map((r) => r.holder_name).sort()).toEqual(["Test Alpha", "Test Revoquee"]);
    expect(rows.find((r) => r.holder_name === "Test Revoquee")?.status).toBe("revoked");
  });

  it("a company contact cannot read the organization's tables directly", async () => {
    await asUser(portalUser.id, async (db) => {
      for (const table of ["candidates", "certificates", "sessions", "client_companies", "profiles"]) {
        const { rows } = await db.query(`select 1 from public.${table}`);
        expect(rows, table).toHaveLength(0);
      }
    });
  });

  it("an invitation cannot be accepted twice or with another e-mail", async () => {
    const stranger = await createAuthUser();
    const token = await asUser((await addMember(org.orgId, "admin")).id, async (db) => {
      const { rows } = await db.query<{ token: string }>(
        `insert into public.company_invitations (organization_id, client_company_id, email, full_name)
         values ($1, $2, 'someone@else.test', 'X') returning token`,
        [org.orgId, companyB],
      );
      return rows[0]!.token;
    });
    expect(await errorHint(asUser(stranger.id, (db) => db.query("select public.accept_company_invitation($1)", [token])))).toBe(
      "INVITATION_EMAIL_MISMATCH",
    );
  });

  it("anonymous visitors cannot call the portal functions", async () => {
    expect(await errorHint(asAnon((db) => db.query("select * from public.company_portal_certificates()")))).toBeDefined();
  });
});

describe("billing", () => {
  it("numbers documents without gaps and locks issued invoices", async () => {
    const admin = org.adminId;
    const insert = (kind: "quote" | "invoice") =>
      asUser(admin, async (db) => {
        const { rows } = await db.query<{ id: string; number: string }>(
          `insert into public.billing_documents (organization_id, kind, number, title, lines)
           values ($1, $2, 'pending', 'Tests', '[{"label":"x","quantity":1,"unit_price_cents":1000}]') returning id, number`,
          [org.orgId, kind],
        );
        return rows[0]!;
      });
    const year = new Date().getFullYear();
    const q1 = await insert("quote");
    const q2 = await insert("quote");
    const f1 = await insert("invoice");
    expect([q1.number, q2.number, f1.number]).toEqual([`DEV-${year}-0001`, `DEV-${year}-0002`, `FAC-${year}-0001`]);

    await asUser(admin, (db) => db.query("update public.billing_documents set status = 'sent' where id = $1", [f1.id]));
    expect(
      await errorHint(asUser(admin, (db) => db.query(`update public.billing_documents set vat_rate = 5 where id = $1`, [f1.id]))),
    ).toBe("INVOICE_LOCKED");
    expect(
      await errorHint(asUser(admin, (db) => db.query(`delete from public.billing_documents where id = $1`, [f1.id])).then(async () => {
        const { rows } = await pool.query("select 1 from public.billing_documents where id = $1", [f1.id]);
        if (rows.length) throw Object.assign(new Error("kept"), { hint: "KEPT" });
      })),
    ).toBe("KEPT");
  });

  it("is invisible to other organizations and to testers", async () => {
    const tester = await addMember(org.orgId, "tester");
    for (const user of [other.adminId, tester.id]) {
      const rows = await asUser(user, async (db) => (await db.query("select 1 from public.billing_documents")).rows);
      expect(rows).toHaveLength(0);
    }
  });
});
