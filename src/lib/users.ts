import { cache } from "react";
import { eq } from "drizzle-orm";
import { SEEDED_USERS } from "./constants";
import { getDb } from "./db";
import { users } from "./db/schema";
import type { PublicUser } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function toPublicUser(row: { id: string; displayName: string; email: string }): PublicUser {
  return { id: row.id, displayName: row.displayName, email: row.email };
}

export async function findUser(id: string) {
  if (!isUuid(id)) return null;
  const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ? toPublicUser(rows[0]) : null;
}

export const listPeople = cache(async (): Promise<PublicUser[]> => {
  const rows = await getDb().select().from(users);
  const order = new Map<string, number>(SEEDED_USERS.map((user, index) => [user.id, index]));
  return rows
    .map(toPublicUser)
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
});
