import { SEEDED_USERS } from "./constants";
import { getDb } from "./db";
import { users } from "./db/schema";

export async function seed() {
  await getDb()
    .insert(users)
    .values(SEEDED_USERS.map((user) => ({ ...user })))
    .onConflictDoNothing();
}
