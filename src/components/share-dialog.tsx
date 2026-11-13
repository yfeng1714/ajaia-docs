"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import type { ShareCandidate } from "@/lib/types";

export function ShareDialog({
  open,
  documentId,
  title,
  candidates,
  onClose,
}: {
  open: boolean;
  documentId: string;
  title: string;
  candidates: ShareCandidate[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [people, setPeople] = useState(candidates);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const dialog = document.getElementById("share-dialog");
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function changeAccess(person: ShareCandidate) {
    setPendingId(person.id);
    setError(null);
    const result = person.shared
      ? await api<{ people: ShareCandidate[] }>(`/api/documents/${documentId}/shares/${person.id}`, {
          method: "DELETE",
        })
      : await api<{ people: ShareCandidate[] }>(`/api/documents/${documentId}/shares`, {
          method: "POST",
          body: JSON.stringify({ userId: person.id }),
        });
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPeople(result.data.people);
    router.refresh();
  }

  return (
    <dialog id="share-dialog" className="share-dialog" aria-labelledby="share-title" onClose={onClose}>
      <h2 id="share-title">Share “{title}”</h2>
      <p>People you add can edit the text. Only you can rename the document or change access.</p>
      <ul>
        {people.map((person) => (
          <li key={person.id}>
            <span className="person">
              <strong>{person.displayName}</strong>
              <small>{person.email}</small>
            </span>
            <button
              type="button"
              className="button button-secondary"
              disabled={pendingId !== null}
              onClick={() => void changeAccess(person)}
            >
              {pendingId === person.id ? "Saving…" : person.shared ? "Remove access" : "Give access"}
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="button" onClick={onClose}>
        Done
      </button>
    </dialog>
  );
}
