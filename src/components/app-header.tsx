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
  const shownId = pendingId ?? currentUser?.id ?? "";

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <strong>Ajaia Docs</strong>
        <span>Shared writing</span>
      </Link>
      <div className="identity">
        <label className="demo-user">
          <span id="demo-user-label">Demo user</span>
          <select
            aria-labelledby="demo-user-label"
            aria-describedby="demo-user-note"
            value={shownId}
            disabled={pendingId !== null || people.length === 0}
            onChange={(event) => {
              const next = event.target.value;
              event.currentTarget.value = shownId;
              if (next && next !== currentUser?.id) void selectUser(next);
            }}
          >
            {currentUser ? null : <option value="">Choose</option>}
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
        </label>
        <p id="demo-user-note" className="hint identity-note">
          Public demo. No password.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </header>
  );
}
