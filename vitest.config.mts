import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: r("./src/") },
      // `server-only` throws outside a React Server Component build; it's a
      // bundler guard, not runtime logic, so stub it for tests.
      { find: /^server-only$/, replacement: r("./tests/stubs/server-only.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { SESSION_SECRET: "test-secret-at-least-16-chars", DATABASE_URL: "postgres://unused" },
  },
});
