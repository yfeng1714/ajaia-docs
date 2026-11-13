export type ApiSuccess<T> = { ok: true; status: number; data: T };
export type ApiFailure = { ok: false; status: number; error: string; code?: string };

export async function api<T>(url: string, init?: RequestInit): Promise<ApiSuccess<T> | ApiFailure> {
  try {
    const headers = new Headers(init?.headers);
    if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(url, { ...init, headers });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: payload.error || "The request failed. Try again.",
        code: payload.code,
      };
    }
    return { ok: true, status: response.status, data: payload as T };
  } catch {
    return { ok: false, status: 0, error: "Network error. Check your connection and try again." };
  }
}
