"use client";

import { useSyncExternalStore } from "react";

function formatLocalTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function LocalTime({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    () => () => {},
    () => formatLocalTime(iso),
    () => "—",
  );
  return <time dateTime={iso}>{label || "—"}</time>;
}
