import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { textToDoc } from "../src/lib/content";
import { SEEDED_USERS } from "../src/lib/constants";
import { closeDb, getDb } from "../src/lib/db";
import { documentShares, documents } from "../src/lib/db/schema";
import {
  createDocument,
  getDocument,
  grantAccess,
  importTextDocument,
  listDocuments,
  revokeAccess,
  updateDocument,
} from "../src/lib/documents";
import { seed } from "../src/lib/seed";

const [alex, sam, lee] = SEEDED_USERS.map((user) => user.id);

beforeAll(async () => {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const name = new URL(databaseUrl).pathname.split("/").filter(Boolean).pop();
  if (name !== "ajaia_docs_test") {
    throw new Error(`Refusing to run access tests against ${name || "an unnamed database"}.`);
  }
  await migrate(getDb(), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await seed();
});

beforeEach(async () => {
  const db = getDb();
  await db.delete(documentShares);
  await db.delete(documents);
});

afterAll(async () => {
  await closeDb();
});

it("persists a grant, lets the recipient edit, and keeps everyone else out", async () => {
  const created = await createDocument(alex, "Access test");
  expect((await listDocuments(sam)).shared).toHaveLength(0);
  await expect(getDocument(sam, created.id)).rejects.toMatchObject({ status: 404 });
  await expect(
    updateDocument(sam, created.id, { expectedRevision: created.revision, content: textToDoc("nope") }),
  ).rejects.toMatchObject({ status: 404 });

  await grantAccess(alex, created.id, sam);
  const shared = await getDocument(sam, created.id);
  expect(shared.role).toBe("editor");
  expect((await listDocuments(sam)).shared.map((document) => document.id)).toContain(created.id);
  expect((await listDocuments(sam)).owned).toHaveLength(0);

  const edited = await updateDocument(sam, created.id, {
    expectedRevision: shared.revision,
    content: textToDoc("Edited by Sam"),
  });
  expect(edited.revision).toBe(shared.revision + 1);
  const reopened = await getDocument(alex, created.id);
  expect(JSON.stringify(reopened.content)).toContain("Edited by Sam");

  await expect(updateDocument(sam, created.id, { expectedRevision: edited.revision, title: "Hijack" })).rejects.toMatchObject({
    status: 403,
  });
  await expect(grantAccess(sam, created.id, lee)).rejects.toMatchObject({ status: 403 });
  await expect(getDocument(lee, created.id)).rejects.toMatchObject({ status: 404 });
  expect((await listDocuments(lee)).shared).toHaveLength(0);

  await revokeAccess(alex, created.id, sam);
  await expect(getDocument(sam, created.id)).rejects.toMatchObject({ status: 404 });
});

it("rejects a stale save without erasing the newer version", async () => {
  const created = await createDocument(alex, "Revision test");
  const first = await updateDocument(alex, created.id, {
    expectedRevision: created.revision,
    content: textToDoc("first"),
  });
  await expect(
    updateDocument(alex, created.id, {
      expectedRevision: created.revision,
      content: textToDoc("stale"),
    }),
  ).rejects.toMatchObject({ status: 409, code: "stale_revision" });
  const current = await getDocument(alex, created.id);
  expect(JSON.stringify(current.content)).toContain("first");
  expect(JSON.stringify(current.content)).not.toContain("stale");
  expect(current.revision).toBe(first.revision);
});

it("imports a utf-8 text file and rejects unsupported uploads", async () => {
  const imported = await importTextDocument(alex, {
    filename: "notes/meeting-notes.txt",
    bytes: new TextEncoder().encode("Line one\nLine two"),
  });
  expect(imported.title).toBe("meeting-notes");
  expect(imported.content.content?.map((node) => node.content?.[0]?.text)).toEqual(["Line one", "Line two"]);
  const reopened = await getDocument(alex, imported.id);
  expect(reopened.content).toEqual(imported.content);

  await expect(
    importTextDocument(alex, { filename: "notes.md", bytes: new TextEncoder().encode("hi") }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    importTextDocument(alex, { filename: "notes.txt", bytes: Uint8Array.from([0xff]) }),
  ).rejects.toMatchObject({ status: 400 });
  const tooBig = new Uint8Array(256 * 1024 + 1);
  tooBig.fill(65);
  await expect(importTextDocument(alex, { filename: "big.txt", bytes: tooBig })).rejects.toMatchObject({ status: 400 });
});
