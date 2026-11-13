import { and, desc, eq, sql } from "drizzle-orm";
import {
  decodeUtf8Text,
  emptyDoc,
  parseContent,
  parseTitle,
  textToDoc,
  titleFromFilename,
  type EditorDoc,
} from "./content";
import { DEFAULT_TITLE, MAX_IMPORT_BYTES, SEEDED_USERS } from "./constants";
import { getDb } from "./db";
import { documentShares, documents, users } from "./db/schema";
import { AppError } from "./errors";
import type { DocumentDetail, DocumentRole, DocumentSummary, ShareCandidate } from "./types";
import { findUser, isUuid } from "./users";

type DocumentRow = typeof documents.$inferSelect;

function iso(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

function toDetail(row: DocumentRow, role: DocumentRole, ownerName: string): DocumentDetail {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    ownerName,
    updatedAt: iso(row.updatedAt),
    role,
    content: row.content,
    revision: Number(row.revision),
    canRename: role === "owner",
    canShare: role === "owner",
  };
}

async function assertUser(userId: string) {
  const user = await findUser(userId);
  if (!user) throw new AppError("Choose a demo user before continuing.", 401);
  return user;
}

async function loadAccessible(userId: string, documentId: string) {
  if (!isUuid(userId) || !isUuid(documentId)) {
    throw new AppError("This document isn't available to you.", 404);
  }
  const rows = await getDb()
    .select({ document: documents, ownerName: users.displayName })
    .from(documents)
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(eq(documents.id, documentId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AppError("This document isn't available to you.", 404);
  if (row.document.ownerId === userId) {
    return { ...row, role: "owner" as const };
  }
  const shares = await getDb()
    .select({ userId: documentShares.userId })
    .from(documentShares)
    .where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, userId)))
    .limit(1);
  if (!shares[0]) throw new AppError("This document isn't available to you.", 404);
  return { ...row, role: "editor" as const };
}

export async function listDocuments(userId: string) {
  await assertUser(userId);
  const db = getDb();
  const ownedRows = await db
    .select({
      id: documents.id,
      title: documents.title,
      updatedAt: documents.updatedAt,
      ownerName: users.displayName,
    })
    .from(documents)
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(eq(documents.ownerId, userId))
    .orderBy(desc(documents.updatedAt));
  const sharedRows = await db
    .select({
      id: documents.id,
      title: documents.title,
      updatedAt: documents.updatedAt,
      ownerName: users.displayName,
    })
    .from(documentShares)
    .innerJoin(documents, eq(documents.id, documentShares.documentId))
    .innerJoin(users, eq(users.id, documents.ownerId))
    .where(eq(documentShares.userId, userId))
    .orderBy(desc(documents.updatedAt));

  const toSummary = (
    row: { id: string; title: string; updatedAt: Date | string; ownerName: string },
    role: DocumentRole,
  ): DocumentSummary => ({
    id: row.id,
    title: row.title,
    ownerName: row.ownerName,
    updatedAt: iso(row.updatedAt),
    role,
  });

  return {
    owned: ownedRows.map((row) => toSummary(row, "owner")),
    shared: sharedRows.map((row) => toSummary(row, "editor")),
  };
}

export async function createDocument(userId: string, title: string = DEFAULT_TITLE) {
  const user = await assertUser(userId);
  const parsed = parseTitle(title);
  if (!parsed.ok) throw new AppError(parsed.error, 400);
  const [created] = await getDb()
    .insert(documents)
    .values({
      ownerId: userId,
      title: parsed.title,
      content: emptyDoc(),
      revision: 1,
    })
    .returning();
  return toDetail(created, "owner", user.displayName);
}

export async function getDocument(userId: string, documentId: string) {
  const loaded = await loadAccessible(userId, documentId);
  return toDetail(loaded.document, loaded.role, loaded.ownerName);
}

export async function updateDocument(
  userId: string,
  documentId: string,
  input: { expectedRevision: unknown; title?: unknown; content?: unknown },
) {
  if (typeof input.expectedRevision !== "number" || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) {
    throw new AppError("Save was missing the document version. Reload the document and try again.", 400);
  }
  if (input.title === undefined && input.content === undefined) {
    throw new AppError("Nothing to save.", 400);
  }
  const loaded = await loadAccessible(userId, documentId);
  let title: string | undefined;
  if (input.title !== undefined) {
    if (loaded.role !== "owner") throw new AppError("Only the owner can rename this document.", 403);
    const parsed = parseTitle(input.title);
    if (!parsed.ok) throw new AppError(parsed.error, 400);
    title = parsed.title;
  }
  let content: EditorDoc | undefined;
  if (input.content !== undefined) {
    const parsed = parseContent(input.content);
    if (!parsed.ok) throw new AppError(parsed.error, 400, "invalid_content");
    content = parsed.content;
  }

  const updated = await getDb()
    .update(documents)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      revision: sql`${documents.revision} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.revision, input.expectedRevision),
        sql`(
          ${documents.ownerId} = ${userId}
          or exists (
            select 1 from document_shares
            where document_shares.document_id = ${documents.id}
              and document_shares.user_id = ${userId}
          )
        )`,
      ),
    )
    .returning();

  const saved = updated[0];
  if (!saved) {
    await loadAccessible(userId, documentId);
    throw new AppError(
      "A newer version was saved. Your edits in this tab were kept. Reload to see the saved version, or copy your text before reloading.",
      409,
      "stale_revision",
    );
  }
  return toDetail(saved, loaded.role, loaded.ownerName);
}

export async function importTextDocument(userId: string, file: { filename: string; bytes: Uint8Array }) {
  const user = await assertUser(userId);
  const filename = file.filename.trim();
  if (!filename.toLowerCase().endsWith(".txt")) {
    throw new AppError("Only .txt files can be imported.", 400);
  }
  if (file.bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new AppError("This file is larger than 256 KB. Shorten it and try again.", 400);
  }
  const decoded = decodeUtf8Text(file.bytes);
  if (!decoded.ok) throw new AppError(decoded.error, 400);
  const content = textToDoc(decoded.text);
  const parsed = parseContent(content);
  if (!parsed.ok) throw new AppError(parsed.error, 400);
  const title = parseTitle(titleFromFilename(filename));
  if (!title.ok) throw new AppError(title.error, 400);
  const [created] = await getDb()
    .insert(documents)
    .values({
      ownerId: userId,
      title: title.title,
      content: parsed.content,
      revision: 1,
    })
    .returning();
  return toDetail(created, "owner", user.displayName);
}

export async function listShareCandidates(userId: string, documentId: string): Promise<ShareCandidate[]> {
  const loaded = await loadAccessible(userId, documentId);
  if (loaded.role !== "owner") throw new AppError("Only the owner can change who has access.", 403);
  const people = await getDb().select().from(users);
  const shares = await getDb()
    .select({ userId: documentShares.userId })
    .from(documentShares)
    .where(eq(documentShares.documentId, documentId));
  const sharedIds = new Set(shares.map((share) => share.userId));
  const seedOrder = new Map<string, number>(SEEDED_USERS.map((user, index) => [user.id, index]));
  return people
    .filter((person) => person.id !== loaded.document.ownerId)
    .map((person) => ({
      id: person.id,
      displayName: person.displayName,
      email: person.email,
      shared: sharedIds.has(person.id),
    }))
    .sort((a, b) => (seedOrder.get(a.id) ?? 99) - (seedOrder.get(b.id) ?? 99));
}

export async function grantAccess(userId: string, documentId: string, recipientId: string) {
  const loaded = await loadAccessible(userId, documentId);
  if (loaded.role !== "owner") throw new AppError("Only the owner can change who has access.", 403);
  if (!isUuid(recipientId)) throw new AppError("Choose a person to share with.", 400);
  if (recipientId === loaded.document.ownerId) throw new AppError("You already own this document.", 400);
  const recipient = await findUser(recipientId);
  if (!recipient) throw new AppError("That person is not one of the demo users.", 400);
  await getDb()
    .insert(documentShares)
    .values({ documentId, userId: recipientId })
    .onConflictDoNothing();
  return listShareCandidates(userId, documentId);
}

export async function revokeAccess(userId: string, documentId: string, recipientId: string) {
  const loaded = await loadAccessible(userId, documentId);
  if (loaded.role !== "owner") throw new AppError("Only the owner can change who has access.", 403);
  if (!isUuid(recipientId)) throw new AppError("Choose a person to update.", 400);
  await getDb()
    .delete(documentShares)
    .where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, recipientId)));
  return listShareCandidates(userId, documentId);
}
