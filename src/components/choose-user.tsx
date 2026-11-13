"use client";

import type { PublicUser } from "@/lib/types";
import { useSelectUser } from "./use-select-user";

export function ChooseUser({ people, note }: { people: PublicUser[]; note?: string }) {
  const { selectUser, error, pendingId } = useSelectUser();

  return (
    <section className="panel">
      <h1>Choose a person</h1>
      <p className="lede">
        {note ??
          "This demo has three seeded people. Pick one to see the documents they own and the documents shared with them."}
      </p>
      {people.length === 0 ? (
        <p className="form-error">No demo users are available yet. Run npm run db:setup, then refresh.</p>
      ) : (
        <div className="identity-options">
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              disabled={pendingId !== null}
              onClick={() => void selectUser(person.id)}
            >
              {pendingId === person.id ? "Opening…" : person.displayName}
            </button>
          ))}
        </div>
      )}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
