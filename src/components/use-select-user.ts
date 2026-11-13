"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { cancelEditSession, getEditorDirty, pauseEditing, resumeEditing } from "@/lib/client/dirty";
import { switchDemoUser } from "@/lib/client/switch-user";
import type { PublicUser } from "@/lib/types";

export function useSelectUser() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function selectUser(userId: string) {
    await switchDemoUser({
      userId,
      blocked: getEditorDirty(),
      confirm: (message) => window.confirm(message),
      pause: pauseEditing,
      resume: resumeEditing,
      cancel: cancelEditSession,
      onStart: () => {
        setPendingId(userId);
        setError(null);
      },
      postSession: async (id) => {
        const result = await api<{ user: PublicUser }>("/api/session", {
          method: "POST",
          body: JSON.stringify({ userId: id }),
        });
        if (!result.ok) return { ok: false, error: result.error };
        return { ok: true };
      },
      onError: (message) => {
        setPendingId(null);
        setError(message);
      },
      onSuccess: () => {
        setPendingId(null);
        router.refresh();
      },
    });
  }

  return { selectUser, error, pendingId };
}
