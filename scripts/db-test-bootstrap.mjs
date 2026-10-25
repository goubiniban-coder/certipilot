// Creates a throwaway database on a plain PostgreSQL, with a minimal Supabase
// shim, then applies every migration and the seed. Used by CI and by
// environments where `supabase start` (Docker) is not available.
//
//   ADMIN_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
//   node scripts/db-test-bootstrap.mjs certipilot_test
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const adminUrl = process.env.ADMIN_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
const dbName = process.argv[2] ?? "certipilot_test";
if (!/^[a-z_][a-z0-9_]*$/.test(dbName)) throw new Error(`Nom de base invalide : ${dbName}`);

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
await admin.query(`drop database if exists ${dbName} with (force)`);
await admin.query(`create database ${dbName}`);
await admin.end();

const url = new URL(adminUrl);
url.pathname = `/${dbName}`;
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();

const root = new URL("..", import.meta.url).pathname;
const run = async (file) => {
  try {
    await client.query(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Échec dans ${file}`);
    throw error;
  }
};

await run(join(root, "tests/db/supabase-shim.sql"));
const migrationsDir = join(root, "supabase/migrations");
for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
  await run(join(migrationsDir, file));
}
await run(join(root, "supabase/seed.sql"));
await client.end();

console.log(`Base ${dbName} prête : ${url.toString().replace(/:[^:@/]+@/, ":***@")}`);
