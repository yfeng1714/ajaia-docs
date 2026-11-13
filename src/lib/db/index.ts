import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Sql = ReturnType<typeof postgres>;
type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  sql?: Sql;
  db?: Database;
};

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and point it at Postgres.");
  }
  if (process.env.VITEST) {
    let name = "";
    try {
      name = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    } catch {
      name = "";
    }
    if (name !== "ajaia_docs_test") {
      throw new Error(`Refusing to run tests against database "${name || "unknown"}". Use ajaia_docs_test.`);
    }
  }
  return url;
}

export function getDb() {
  if (!globalForDb.db) {
    const pooled = Boolean(process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT);
    const sql = postgres(databaseUrl(), { max: pooled ? 1 : 10, prepare: false });
    globalForDb.sql = sql;
    globalForDb.db = drizzle(sql, { schema });
  }
  return globalForDb.db;
}

export async function closeDb() {
  await globalForDb.sql?.end({ timeout: 5 });
  globalForDb.sql = undefined;
  globalForDb.db = undefined;
}
