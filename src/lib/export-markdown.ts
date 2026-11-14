import type { EditorDoc, EditorMark, EditorNode } from "./content";

const INLINE_ESCAPES = /[\\`*_{}[\]()#+!-]/g;

export function documentToMarkdown(title: string, doc: EditorDoc): string {
  const heading = `# ${escapeInline(singleLine(title) || "Untitled document")}`;
  const body = renderBlocks(doc.content ?? []);
  return body ? `${heading}\n\n${body}\n` : `${heading}\n`;
}

export function markdownFilename(title: string): string {
  const cleaned = [...singleLine(title).replace(/[<>:"/\\|?*]/g, " ")]
    .slice(0, 80)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[. ]+$/g, "")
    .trim();
  return `${cleaned || "Untitled document"}.md`;
}

function singleLine(title: string) {
  return title.replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
}

function renderBlocks(nodes: EditorNode[]) {
  return nodes
    .map((node) => renderBlock(node))
    .filter((block): block is string => Boolean(block))
    .join("\n\n");
}

function renderBlock(node: EditorNode): string | null {
  if (node.type === "heading") {
    const level = node.attrs?.level === 2 ? 2 : 1;
    const prefix = `${"#".repeat(level)} `;
    return prefix + renderInline(node, " ".repeat(prefix.length));
  }
  if (node.type === "paragraph") {
    const text = renderInline(node, "");
    return text || null;
  }
  if (node.type === "bulletList" || node.type === "orderedList") return renderList(node, "");
  return null;
}

function renderList(node: EditorNode, indent: string): string {
  const ordered = node.type === "orderedList";
  const start = ordered ? listStart(node) : 1;
  const lines: string[] = [];
  (node.content ?? []).forEach((item, index) => {
    const marker = ordered ? `${start + index}. ` : "- ";
    const childIndent = indent + " ".repeat(marker.length);
    const children = item.content ?? [];
    let usedMarker = false;
    for (const child of children) {
      if (child.type === "bulletList" || child.type === "orderedList") {
        if (!usedMarker) {
          lines.push(indent + marker.trimEnd());
          usedMarker = true;
        }
        const nested = renderList(child, childIndent);
        if (nested) lines.push(nested);
        continue;
      }
      const text = renderInline(child, childIndent);
      if (!usedMarker) {
        lines.push(indent + marker + text);
        usedMarker = true;
      } else if (text) {
        lines.push("");
        lines.push(childIndent + text);
      }
    }
    if (!usedMarker) lines.push(indent + marker.trimEnd());
  });
  return lines.join("\n");
}

function listStart(node: EditorNode) {
  const start = node.attrs?.start;
  if (typeof start === "number" && Number.isInteger(start) && start >= 1 && start <= 9999) return start;
  return 1;
}

function renderInline(node: EditorNode, continuationIndent: string) {
  let out = "";
  for (const child of node.content ?? []) {
    if (child.type === "hardBreak") {
      out += `  \n${continuationIndent}`;
      continue;
    }
    if (child.type === "text" && child.text) out += renderMarked(child.text, child.marks);
  }
  return out;
}

function renderMarked(text: string, marks: EditorMark[] | undefined) {
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  const core = text.slice(leading.length, text.length - trailing.length);
  if (!core) return escapeInline(text);
  const kinds = new Set((marks ?? []).map((mark) => mark.type));
  let wrapped = escapeInline(core);
  if (kinds.has("underline")) wrapped = `<u>${wrapped}</u>`;
  if (kinds.has("italic")) wrapped = `*${wrapped}*`;
  if (kinds.has("bold")) wrapped = `**${wrapped}**`;
  return escapeInline(leading) + wrapped + escapeInline(trailing);
}

function escapeInline(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(INLINE_ESCAPES, (character) => `\\${character}`)
    .replace(/(^|\n)(\d+)\. /g, "$1$2\\. ");
}
