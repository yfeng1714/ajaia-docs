"use client";

import { useEffect } from "react";
import { databaseErrorMessage } from "@/lib/errors";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const friendly = databaseErrorMessage(error);

  return (
    <section className="panel">
      <h1>This page didn&apos;t load</h1>
      <p>{friendly ?? "Nothing new was saved. Try again."}</p>
      <button type="button" className="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
