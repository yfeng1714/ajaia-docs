import { MAX_CONTENT_BYTES, MAX_TITLE_LENGTH } from "./constants";

export type EditorMark = {
  type: "bold" | "italic" | "underline";
};

export type EditorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: EditorMark[];
  content?: EditorNode[];
};

export type EditorDoc = {
  type: "doc";
  content?: EditorNode[];
};

const TOP_LEVEL = new Set(["paragraph", "heading", "bulletList", "orderedList"]);
const MARKS = new Set(["bold", "italic", "underline"]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  heading: new Set(["level"]),
  orderedList: new Set(["start", "type"]),
};

export function emptyDoc(): EditorDoc {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function parseTitle(input: unknown): { ok: true; title: string } | { ok: false; error: string } {
  if (typeof input !== "string") return { ok: false, error: "Enter a title." };
  const title = input.trim();
  if (!title) return { ok: false, error: "Give the document a title." };
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Titles can be at most ${MAX_TITLE_LENGTH} characters.` };
  }
  if (/[\u0000-\u001f]/.test(title)) {
    return { ok: false, error: "Titles cannot include line breaks or control characters." };
  }
  return { ok: true, title };
}

export function titleFromFilename(filename: string) {
  const base = filename.split(/[/\\]/).pop()?.trim() ?? "";
  const stem = base
    .replace(/\.txt$/i, "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const title = (stem || "Imported document").slice(0, MAX_TITLE_LENGTH).trim();
  return title || "Imported document";
}

export function decodeUtf8Text(bytes: Uint8Array): { ok: true; text: string } | { ok: false; error: string } {
  if (bytes.includes(0)) {
    return { ok: false, error: "This file looks binary. Upload a plain UTF-8 .txt file." };
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, text };
  } catch {
    return { ok: false, error: "This file is not valid UTF-8. Save it as UTF-8 text and try again." };
  }
}

export function textToDoc(raw: string): EditorDoc {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");
  return {
    type: "doc",
    content: lines.map((line) =>
      line.length === 0 ? { type: "paragraph" } : { type: "paragraph", content: [{ type: "text", text: line }] },
    ),
  };
}

export function parseContent(input: unknown): { ok: true; content: EditorDoc } | { ok: false; error: string } {
  const error = validateContent(input);
  if (error) return { ok: false, error };
  return { ok: true, content: input as EditorDoc };
}

export function validateContent(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return "The document content is not valid.";
  }
  let encoded = "";
  try {
    encoded = JSON.stringify(input);
  } catch {
    return "The document content is not valid.";
  }
  if (encoded.length > MAX_CONTENT_BYTES) {
    return "This document is too large to save.";
  }
  const doc = input as EditorNode;
  if (doc.type !== "doc") return "The document content is not valid.";
  return validateChildren(doc, "doc", 0, { count: 0 });
}

function validateChildren(node: EditorNode, parent: string, depth: number, state: { count: number }): string | null {
  state.count += 1;
  if (state.count > 8000) return "This document is too large to save.";
  if (depth > 12) return "This document is nested too deeply to save.";
  if (!node || typeof node !== "object" || typeof node.type !== "string") {
    return "The document content is not valid.";
  }
  const extra = objectKeys(node).filter((key) => !["type", "attrs", "content", "text", "marks"].includes(key));
  if (extra.length > 0) return "The document contains formatting that cannot be saved.";

  const attrError = validateAttrs(node);
  if (attrError) return attrError;

  if (node.type === "text") {
    if (parent !== "paragraph" && parent !== "heading") {
      return "The document contains formatting that cannot be saved.";
    }
    if (typeof node.text !== "string" || node.text.length > MAX_CONTENT_BYTES) {
      return "The document contains a text block that cannot be saved.";
    }
    if (node.content) return "The document contains formatting that cannot be saved.";
    return validateMarks(node.marks);
  }

  if (node.type === "hardBreak") {
    if (parent !== "paragraph" && parent !== "heading") {
      return "The document contains formatting that cannot be saved.";
    }
    if (node.content || node.text || node.marks) return "The document contains formatting that cannot be saved.";
    return null;
  }

  if (node.text !== undefined || node.marks !== undefined) {
    return "The document contains formatting that cannot be saved.";
  }

  const childError = validateChildTypes(node, parent);
  if (childError) return childError;
  if (!node.content) return null;
  if (!Array.isArray(node.content)) return "The document content is not valid.";
  for (const child of node.content) {
    const error = validateChildren(child, node.type, depth + 1, state);
    if (error) return error;
  }
  return null;
}

function validateChildTypes(node: EditorNode, parent: string) {
  if (node.type === "doc") {
    if (parent !== "doc") return "The document content is not valid.";
    return childrenAllowed(node, TOP_LEVEL);
  }
  if (node.type === "paragraph" || node.type === "heading") {
    const parentOk =
      parent === "doc" || (parent === "listItem" && node.type === "paragraph");
    if (!parentOk) return "The document contains formatting that cannot be saved.";
    return childrenAllowed(node, new Set(["text", "hardBreak"]));
  }
  if (node.type === "bulletList" || node.type === "orderedList") {
    if (parent !== "doc" && parent !== "listItem") {
      return "The document contains formatting that cannot be saved.";
    }
    return childrenAllowed(node, new Set(["listItem"]));
  }
  if (node.type === "listItem") {
    if (parent !== "bulletList" && parent !== "orderedList") {
      return "The document contains formatting that cannot be saved.";
    }
    return childrenAllowed(node, new Set(["paragraph", "bulletList", "orderedList"]));
  }
  return "The document contains formatting that cannot be saved.";
}

function childrenAllowed(node: EditorNode, allowed: Set<string>) {
  if (!node.content) return null;
  if (!Array.isArray(node.content)) return "The document content is not valid.";
  for (const child of node.content) {
    if (!child || typeof child.type !== "string" || !allowed.has(child.type)) {
      return "The document contains formatting that cannot be saved.";
    }
  }
  return null;
}

function validateAttrs(node: EditorNode) {
  const attrs = node.attrs;
  if (attrs !== undefined && (!attrs || typeof attrs !== "object" || Array.isArray(attrs))) {
    return "The document contains formatting that cannot be saved.";
  }
  const record = attrs ?? {};
  const allowed = ALLOWED_ATTRS[node.type] ?? new Set<string>();
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) return "The document contains formatting that cannot be saved.";
  }
  if (node.type === "heading" && record.level !== 1 && record.level !== 2) {
    return "Heading size is not supported.";
  }
  if (node.type === "orderedList" && record.start !== undefined) {
    const start = record.start;
    if (typeof start !== "number" || !Number.isInteger(start) || start < 1 || start > 9999) {
      return "The numbered list cannot be saved.";
    }
  }
  if (node.type === "orderedList" && record.type != null) {
    if (typeof record.type !== "string" || !["1", "a", "A", "i", "I"].includes(record.type)) {
      return "The numbered list cannot be saved.";
    }
  }
  return null;
}

function validateMarks(marks: EditorNode["marks"]) {
  if (marks === undefined) return null;
  if (!Array.isArray(marks)) return "The document contains formatting that cannot be saved.";
  for (const mark of marks) {
    if (!mark || typeof mark !== "object" || !MARKS.has(mark.type)) {
      return "The document contains formatting that cannot be saved.";
    }
    if (objectKeys(mark).some((key) => key !== "type")) {
      return "The document contains formatting that cannot be saved.";
    }
  }
  return null;
}

function objectKeys(value: object) {
  return Object.keys(value);
}
