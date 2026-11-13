"use client";

import Link from "next/link";
import type { PublicUser } from "@/lib/types";
import { useSelectUser } from "./use-select-user";

export function AppHeader({
  currentUser,
  people,
}: {
  currentUser: PublicUser | null;
  people: PublicUser[];
}) {
  const { selectUser, error, pendingId } = useSelectUser();

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <strong>Ajaia Docs</strong>
        <span>Shared writing</span>
      </Link>
      <div className="identity">
        <div>
          <p className="eyebrow">Viewing as</p>
          <p className="hint">Public demo. No password.</p>
        </div>
        <div className="identity-options" role="group" aria-label="Demo user">
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              aria-pressed={currentUser?.id === person.id}
              disabled={pendingId !== null}
              onClick={() => {
                if (person.id !== currentUser?.id) void selectUser(person.id);
              }}
            >
              {person.displayName}
            </button>
          ))}
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </header>
  );
}
