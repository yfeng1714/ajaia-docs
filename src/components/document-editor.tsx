"use client";

import Link from "next/link";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client/api";
import { runDocumentSave, type SaveStatus } from "@/lib/client/document-save";
import {
  cancelEditSession,
  getEditorDirty,
  registerEditSession,
  setUnsavedWork,
} from "@/lib/client/dirty";
import type { EditorDoc } from "@/lib/content";
import { createEditorExtensions } from "@/lib/editor-extensions";
import type { DocumentDetail, ShareCandidate } from "@/lib/types";
import { LocalTime } from "./local-time";
import { ShareDialog } from "./share-dialog";

const AUTOSAVE_MS = 700;

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
  const pausedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const statusRef = useRef<SaveStatus>(status);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const onChangeRef = useRef<(content: EditorDoc) => void>(() => {});

  useEffect(() => {
    statusRef.current = status;
    saveRef.current = save;
    onChangeRef.current = (content) => {
      contentRef.current = content;
      markDirty();
    };
  });

  function markDirty() {
    if (ignoreRef.current || statusRef.current.kind === "conflict") {
      dirtyRef.current = true;
      setUnsavedWork(true);
      return;
    }
    dirtyRef.current = true;
    setUnsavedWork(true);
    setStatus({ kind: "dirty" });
    if (savingRef.current || pausedRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void saveRef.current();
    }, AUTOSAVE_MS);
  }

  async function save() {
    await runDocumentSave({
      documentId: doc.id,
      canRename: doc.canRename,
      titleRef,
      contentRef,
      revisionRef,
      dirtyRef,
      savingRef,
      ignoreRef,
      pausedRef,
      timerRef,
      getStatus: () => statusRef.current.kind,
      setStatus,
      setTitle,
      send: async (body) => {
        const result = await api<{ document: DocumentDetail }>(`/api/documents/${doc.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        if (!result.ok) return { ok: false, error: result.error, code: result.code };
        return { ok: true, data: { document: result.data.document } };
      },
    });
  }

  const extensions = useMemo(() => createEditorExtensions(), []);
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
    pausedRef.current = false;
    const unregister = registerEditSession({
      pause: () => {
        pausedRef.current = true;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = null;
      },
      resume: () => {
        pausedRef.current = false;
        if (dirtyRef.current && !savingRef.current && !ignoreRef.current && statusRef.current.kind !== "conflict") {
          void saveRef.current();
        }
      },
      cancel: () => {
        ignoreRef.current = true;
        pausedRef.current = true;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = null;
      },
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
      setUnsavedWork(false);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.document.removeEventListener("click", onClick, true);
    };
  }, []);

  const statusText =
    status.kind === "saving"
      ? "Saving…"
      : status.kind === "dirty"
        ? "Unsaved changes"
        : status.kind === "conflict"
          ? "Newer version saved"
          : status.kind === "error"
            ? "Couldn't save"
            : null;

  return (
    <div className="workspace">
      <div className="sheet">
        <Link href="/" className="back-link">
          ← All documents
        </Link>
        <div className="doc-heading">
          <div className="doc-heading-main">
            {doc.canRename ? (
              <input
                id="document-title"
                className="title-input"
                aria-label="Document title"
                value={title}
                maxLength={120}
                onChange={(event) => {
                  titleRef.current = event.target.value;
                  setTitle(event.target.value);
                  markDirty();
                }}
              />
            ) : (
              <h1 className="title-display">{doc.title}</h1>
            )}
            <p className="owner-line">
              <span>
                Owner: {doc.ownerName}
                {doc.role === "owner" ? " (you)" : ""}
              </span>
              <span className="badge">{doc.role === "owner" ? "Owner" : "Can edit"}</span>
            </p>
          </div>
          <div className="doc-actions">
            <p className="save-state" data-save-state={status.kind} aria-live="polite">
              {status.kind === "saved" ? (
                <>
                  Saved <LocalTime iso={status.updatedAt} />
                </>
              ) : (
                statusText
              )}
            </p>
            <button
              type="button"
              className="button button-secondary"
              disabled={!editor || status.kind === "conflict"}
              onClick={() => {
                if (statusRef.current.kind === "conflict") return;
                dirtyRef.current = true;
                setUnsavedWork(true);
                void saveRef.current();
              }}
            >
              Save
            </button>
            {doc.canShare ? (
              <button type="button" className="button" onClick={() => setShareOpen(true)}>
                Share
              </button>
            ) : null}
          </div>
        </div>
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
                setUnsavedWork(true);
                void saveRef.current();
              }}
            >
              Retry save
            </button>
          </div>
        ) : null}
        <Toolbar editor={editor} />
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

function Toolbar({ editor }: { editor: Editor | null }) {
  function run(command: (current: Editor) => void) {
    if (!editor) return;
    command(editor);
  }

  const block = editor?.isActive("heading", { level: 1 })
    ? "h1"
    : editor?.isActive("heading", { level: 2 })
      ? "h2"
      : "paragraph";

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="tool-group" role="group" aria-label="Marks">
        <ToolButton label="Bold" className="tool tool-strong" pressed={Boolean(editor?.isActive("bold"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleBold().run())}>
          B
        </ToolButton>
        <ToolButton label="Italic" className="tool tool-italic" pressed={Boolean(editor?.isActive("italic"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleItalic().run())}>
          I
        </ToolButton>
        <ToolButton label="Underline" className="tool tool-underline" pressed={Boolean(editor?.isActive("underline"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleUnderline().run())}>
          U
        </ToolButton>
      </div>
      <span className="tool-sep" aria-hidden="true" />
      <label className="style-select">
        <span className="sr-only">Text style</span>
        <select
          aria-label="Text style"
          value={block}
          disabled={!editor}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "h1") run((current) => current.chain().focus().setHeading({ level: 1 }).run());
            else if (value === "h2") run((current) => current.chain().focus().setHeading({ level: 2 }).run());
            else run((current) => current.chain().focus().setParagraph().run());
          }}
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
        </select>
      </label>
      <span className="tool-sep" aria-hidden="true" />
      <div className="tool-group" role="group" aria-label="Lists">
        <ToolButton label="Bulleted list" className="tool" pressed={Boolean(editor?.isActive("bulletList"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleBulletList().run())}>
          Bullets
        </ToolButton>
        <ToolButton label="Numbered list" className="tool" pressed={Boolean(editor?.isActive("orderedList"))} disabled={!editor} onClick={() => run((current) => current.chain().focus().toggleOrderedList().run())}>
          Numbers
        </ToolButton>
      </div>
      <span className="tool-sep" aria-hidden="true" />
      <div className="tool-group" role="group" aria-label="History">
        <ToolButton label="Undo" className="tool" disabled={!editor || !editor.can().undo()} onClick={() => run((current) => current.chain().focus().undo().run())}>
          Undo
        </ToolButton>
        <ToolButton label="Redo" className="tool" disabled={!editor || !editor.can().redo()} onClick={() => run((current) => current.chain().focus().redo().run())}>
          Redo
        </ToolButton>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  className,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  className: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
