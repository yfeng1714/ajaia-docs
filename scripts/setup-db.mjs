import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

try {
  loadEnvFile(".env");
} catch {
  // Hosted environments inject DATABASE_URL directly.
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and point it at Postgres.");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 30 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: path.join(root, "drizzle") });

await sql`
  insert into users (id, display_name, email)
  values
    ('11111111-1111-4111-8111-111111111111', 'Alex Morgan', 'alex@demo.ajaia.test'),
    ('22222222-2222-4222-8222-222222222222', 'Sam Patel', 'sam@demo.ajaia.test'),
    ('33333333-3333-4333-8333-333333333333', 'Lee Chen', 'lee@demo.ajaia.test')
  on conflict (id) do nothing
`;

await sql.end();
console.log("Database is migrated and the demo users are present.");
