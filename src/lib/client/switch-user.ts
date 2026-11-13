export async function switchDemoUser(input: {
  userId: string;
  blocked: boolean;
  confirm: (message: string) => boolean;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  postSession: (userId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onStart: () => void;
  onError: (message: string) => void;
  onSuccess: () => void;
}) {
  if (input.blocked && !input.confirm("You have unsaved changes. Switch users without saving them?")) {
    return;
  }
  input.onStart();
  input.pause();
  const result = await input.postSession(input.userId);
  if (!result.ok) {
    input.resume();
    input.onError(result.error);
    return;
  }
  input.cancel();
  input.onSuccess();
}
