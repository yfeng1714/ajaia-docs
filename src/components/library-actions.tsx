"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";

export function LibraryActions() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"create" | "import" | null>(null);

  async function createDocument() {
    setPending("create");
    setError(null);
    const result = await api<{ document: { id: string } }>("/api/documents", {
      method: "POST",
      body: JSON.stringify({}),
    });
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/documents/${result.data.document.id}`);
  }

  async function importFile(file: File) {
    setPending("import");
    setError(null);
    const body = new FormData();
    body.set("file", file);
    const result = await api<{ document: { id: string } }>("/api/documents/import", {
      method: "POST",
      body,
    });
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/documents/${result.data.document.id}`);
  }

  return (
    <div className="actions">
      <button type="button" className="button" onClick={() => void createDocument()} disabled={pending !== null}>
        {pending === "create" ? "Creating…" : "New document"}
      </button>
      <button
        type="button"
        className="button button-secondary"
        onClick={() => inputRef.current?.click()}
        disabled={pending !== null}
      >
        {pending === "import" ? "Importing…" : "Import .txt"}
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".txt,text/plain"
        aria-label="Import a UTF-8 text file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void importFile(file);
        }}
      />
      <p className="hint">UTF-8 .txt files up to 256 KB. The file becomes a new document, kept as plain text.</p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
