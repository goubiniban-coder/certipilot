import { randomUUID } from "node:crypto";
import pg from "pg";

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  max: 4,
});

export type Db = pg.PoolClient;

export function randomSiret(): string {
  return Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join("");
}

export function randomPrefix(): string {
  return `T${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Creates an auth user directly (as the database owner). */
export async function createAuthUser(email = `${randomUUID()}@test.certipilot.test`) {
  const id = randomUUID();
  await pool.query(
    `insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
     values ($1, 'authenticated', 'authenticated', $2, '', now(), now(), now())`,
    [id, email],
  );
  return { id, email };
}

async function withRole<T>(
  role: "authenticated" | "anon",
  userId: string | null,
  fn: (db: Db) => Promise<T>,
  commit: boolean,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    const claims = JSON.stringify(userId ? { sub: userId, role } : { role });
    await client.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    const result = await fn(client);
    await client.query(commit ? "commit" : "rollback");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Runs `fn` as a signed-in user, with RLS applied. Committed by default. */
export function asUser<T>(userId: string, fn: (db: Db) => Promise<T>, commit = true) {
  return withRole("authenticated", userId, fn, commit);
}

/** Runs `fn` as an anonymous visitor. Always rolled back. */
export function asAnon<T>(fn: (db: Db) => Promise<T>) {
  return withRole("anon", null, fn, false);
}

/** Signs up a new OTC: a user who creates the organization and becomes admin. */
export async function createOrganization(name = "OTC de test") {
  const admin = await createAuthUser();
  const siret = randomSiret();
  const orgId = await asUser(admin.id, async (db) => {
    const { rows } = await db.query<{ id: string }>(
      "select public.create_organization($1, $2, $3, $4) as id",
      [name, siret, randomPrefix(), "Admin de test"],
    );
    return rows[0]!.id;
  });
  return { orgId, adminId: admin.id, siret };
}

/** Adds a member with a given role to an organization (as the owner). */
export async function addMember(orgId: string, role: "admin" | "secretariat" | "tester") {
  const user = await createAuthUser();
  await pool.query(
    `insert into public.profiles (id, organization_id, role, full_name, email) values ($1, $2, $3, $4, $5)`,
    [user.id, orgId, role, `Membre ${role}`, user.email],
  );
  return user;
}

export async function categoryId(orgId: string, recommendation: string, category: string) {
  const { rows } = await pool.query<{ id: string }>(
    `select c.id from public.categories c join public.recommendations r on r.id = c.recommendation_id
     where r.organization_id = $1 and r.code = $2 and c.code = $3`,
    [orgId, recommendation, category],
  );
  return rows[0]!.id;
}

/** Expects a database error and returns its HINT (stable error code). */
export async function errorHint(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    const e = error as pg.DatabaseError;
    return e.hint ?? e.code;
  }
  throw new Error("Une erreur était attendue");
}
