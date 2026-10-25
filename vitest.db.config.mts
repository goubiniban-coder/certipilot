import { defineConfig } from "vitest/config";

// Database tests (RLS, triggers) run against a real Postgres:
// the local Supabase stack (`supabase start`) or DATABASE_URL.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
