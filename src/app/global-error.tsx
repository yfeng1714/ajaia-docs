"use client";

import { useEffect } from "react";
import { databaseErrorMessage } from "@/lib/errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, serif", padding: "2rem" }}>
        <h1>Ajaia Docs couldn&apos;t open</h1>
        <p>{databaseErrorMessage(error) ?? "Refresh the page. If this keeps happening, check the database setup."}</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  );
}
