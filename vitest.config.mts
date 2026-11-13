import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://ajaia:ajaia@127.0.0.1:5433/ajaia_docs_test";

process.env.DATABASE_URL = testDatabaseUrl;
const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 20000,
    env: {
      DATABASE_URL: testDatabaseUrl,
    },
  },
});
