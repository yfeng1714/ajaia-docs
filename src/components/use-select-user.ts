"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { confirmDiscard } from "@/lib/client/dirty";
import type { PublicUser } from "@/lib/types";

export function useSelectUser() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function selectUser(userId: string) {
    if (!confirmDiscard("You have unsaved changes. Switch users without saving them?")) return;
    setPendingId(userId);
    setError(null);
    const result = await api<{ user: PublicUser }>("/api/session", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return { selectUser, error, pendingId };
}
