import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Database tests (RLS, triggers) run against a real Postgres:
// the local Supabase stack (`supabase start`) or DATABASE_URL.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
