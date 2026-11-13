import { defineConfig } from "vitest/config";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://ajaia:ajaia@127.0.0.1:5433/ajaia_docs_test";

process.env.DATABASE_URL = testDatabaseUrl;

export default defineConfig({
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
