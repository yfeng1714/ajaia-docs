"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { cancelEditSession, getEditorDirty, registerEditSession, setEditorDirty } from "@/lib/client/dirty";
import type { EditorDoc } from "@/lib/content";
import { formatTimestamp } from "@/lib/format";
import type { DocumentDetail, ShareCandidate } from "@/lib/types";
import { ShareDialog } from "./share-dialog";

type SaveStatus =
  | { kind: "saved"; updatedAt: string }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

const AUTOSAVE_MS = 700;

function createExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2] },
      link: false,
      strike: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      trailingNode: false,
    }),
    Placeholder.configure({ placeholder: "Write something worth sharing…" }),
  ];
}

export function DocumentEditor({
  doc,
  candidates,
}: {
  doc: DocumentDetail;
  candidates: ShareCandidate[];
}) {
  const [title, setTitle] = useState(doc.title);
  const [status, setStatus] = useState<SaveStatus>({ kind: "saved", updatedAt: doc.updatedAt });
  const [shareOpen, setShareOpen] = useState(false);
  const titleRef = useRef(doc.title);
  const contentRef = useRef<EditorDoc>(doc.content);
  const revisionRef = useRef(doc.revision);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const ignoreRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const statusRef = useRef<SaveStatus>(status);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const onChangeRef = useRef<(content: EditorDoc) => void>(() => {});
  statusRef.current = status;

  function markDirty() {
    if (ignoreRef.current || statusRef.current.kind === "conflict") {
      dirtyRef.current = true;
      setEditorDirty(true);
      return;
    }
    dirtyRef.current = true;
    setEditorDirty(true);
    setStatus({ kind: "dirty" });
    if (savingRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void saveRef.current();
    }, AUTOSAVE_MS);
  }

  async function save() {
    if (ignoreRef.current || statusRef.current.kind === "conflict") return;
    if (savingRef.current) {
      dirtyRef.current = true;
      return;
    }
    if (!dirtyRef.current) return;
    if (doc.canRename) {
      const trimmed = titleRef.current.trim();
      if (!trimmed || trimmed.length > 120) {
        dirtyRef.current = true;
        setEditorDirty(true);
        setStatus({
          kind: "error",
          message: trimmed ? "Titles can be at most 120 characters." : "Give the document a title.",
        });
        return;
      }
    }
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    savingRef.current = true;
    dirtyRef.current = false;
    setEditorDirty(false);
    setStatus({ kind: "saving" });
    const result = await api<{ document: DocumentDetail }>(`/api/documents/${doc.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        expectedRevision: revisionRef.current,
        content: contentRef.current,
        ...(doc.canRename ? { title: titleRef.current } : {}),
      }),
    });
    savingRef.current = false;
    if (ignoreRef.current) return;
    if (!result.ok) {
      dirtyRef.current = true;
      setEditorDirty(true);
      setStatus(
        result.code === "stale_revision"
          ? { kind: "conflict", message: result.error }
          : { kind: "error", message: result.error },
      );
      return;
    }
    revisionRef.current = result.data.document.revision;
    if (doc.canRename) {
      titleRef.current = result.data.document.title;
      setTitle(result.data.document.title);
    }
    if (dirtyRef.current) {
      await save();
      return;
    }
    setEditorDirty(false);
    setStatus({ kind: "saved", updatedAt: result.data.document.updatedAt });
  }

  saveRef.current = save;
  onChangeRef.current = (content) => {
    contentRef.current = content;
    markDirty();
  };

  const extensions = useMemo(() => createExtensions(), []);
  const editor = useEditor({
    extensions,
    content: doc.content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        "aria-label": "Document body",
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = current.getJSON() as EditorDoc;
      if (JSON.stringify(next) === JSON.stringify(contentRef.current)) return;
      onChangeRef.current(next);
    },
  });

  useEffect(() => {
    ignoreRef.current = false;
    const unregister = registerEditSession(() => {
      ignoreRef.current = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    });
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!getEditorDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function onClick(event: MouseEvent) {
      if (!getEditorDirty()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link || link.target === "_blank") return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm("You have unsaved changes. Leave this document without saving them?")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      cancelEditSession();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    window.document.addEventListener("click", onClick, true);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      unregister();
      setEditorDirty(false);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.document.removeEventListener("click", onClick, true);
    };
  }, []);

  const statusLabel =
    status.kind === "saving"
      ? "Saving…"
      : status.kind === "dirty"
        ? "Unsaved changes"
        : status.kind === "saved"
          ? `Saved ${formatTimestamp(status.updatedAt)}`
          : status.kind === "conflict"
            ? "Newer version saved"
            : "Couldn't save";

  return (
    <div className="workspace">
      <div className="sheet">
        <div className="sheet-toolbar">
          <Toolbar
            editor={editor}
            onSave={() => {
              if (statusRef.current.kind === "conflict") return;
              dirtyRef.current = true;
              setEditorDirty(true);
              void saveRef.current();
            }}
          />
          <div className="sheet-meta">
            <p className="save-state" data-save-state={status.kind} aria-live="polite">
              {statusLabel}
            </p>
            {doc.canShare ? (
              <button type="button" className="button" onClick={() => setShareOpen(true)}>
                Share
              </button>
            ) : null}
          </div>
        </div>
        {doc.canRename ? (
          <>
            <label className="title-label" htmlFor="document-title">
              Title
            </label>
            <input
              id="document-title"
              className="title-input"
              value={title}
              maxLength={120}
              onChange={(event) => {
                titleRef.current = event.target.value;
                setTitle(event.target.value);
                markDirty();
              }}
            />
          </>
        ) : (
          <>
            <p className="title-label">Title</p>
            <h1 className="title-display">{doc.title}</h1>
          </>
        )}
        <p className="hint permission-note">
          {doc.canShare
            ? "You own this document. Sharing lets another demo user edit the text."
            : `Shared by ${doc.ownerName}. You can edit the text. Only the owner can rename it or change access.`}
        </p>
        {status.kind === "conflict" ? (
          <div className="banner banner-warning" role="alert">
            <p>{status.message}</p>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                if (window.confirm("Reload the last saved version? The edits in this tab will be discarded.")) {
                  window.location.reload();
                }
              }}
            >
              Reload saved version
            </button>
          </div>
        ) : null}
        {status.kind === "error" ? (
          <div className="banner banner-danger" role="alert">
            <p>{status.message}</p>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                dirtyRef.current = true;
                setEditorDirty(true);
                void saveRef.current();
              }}
            >
              Retry save
            </button>
          </div>
        ) : null}
        <div className="editor">
          {editor ? <EditorContent editor={editor} /> : <p className="hint">Opening the document…</p>}
        </div>
      </div>
      {doc.canShare && shareOpen ? (
        <ShareDialog
          key={candidates.map((person) => `${person.id}:${person.shared}`).join(",")}
          open
          documentId={doc.id}
          title={title}
          candidates={candidates}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Toolbar({ editor, onSave }: { editor: Editor | null; onSave: () => void }) {
  function run(command: (current: Editor) => void) {
    if (!editor) return;
    command(editor);
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton label="Bold" pressed={Boolean(editor?.isActive("bold"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleBold().run())} />
      <ToolButton label="Italic" pressed={Boolean(editor?.isActive("italic"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleItalic().run())} />
      <ToolButton label="Underline" pressed={Boolean(editor?.isActive("underline"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleUnderline().run())} />
      <ToolButton label="H1" pressed={Boolean(editor?.isActive("heading", { level: 1 }))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleHeading({ level: 1 }).run())} />
      <ToolButton label="H2" pressed={Boolean(editor?.isActive("heading", { level: 2 }))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleHeading({ level: 2 }).run())} />
      <ToolButton label="Paragraph" pressed={Boolean(editor?.isActive("paragraph"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().setParagraph().run())} />
      <ToolButton label="List" pressed={Boolean(editor?.isActive("bulletList"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleBulletList().run())} />
      <ToolButton label="Numbered" pressed={Boolean(editor?.isActive("orderedList"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleOrderedList().run())} />
      <ToolButton label="Undo" disabled={!editor || !editor.can().undo()} onClick={() => run((current) => current.chain().focus().undo().run())} />
      <ToolButton label="Redo" disabled={!editor || !editor.can().redo()} onClick={() => run((current) => current.chain().focus().redo().run())} />
      <ToolButton label="Save" disabled={!editor} onClick={onSave} />
    </div>
  );
}

function ToolButton({
  label,
  pressed,
  disabled,
  onClick,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={label === "Save" ? "button" : "tool"}
      aria-pressed={pressed}
      aria-label={label === "H1" ? "Heading 1" : label === "H2" ? "Heading 2" : label === "List" ? "Bulleted list" : label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
