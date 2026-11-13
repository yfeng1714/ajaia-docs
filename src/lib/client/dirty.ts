let dirty = false;
let cancelPending: (() => void) | null = null;

export function setEditorDirty(value: boolean) {
  dirty = value;
}

export function getEditorDirty() {
  return dirty;
}

export function registerEditSession(cancel: () => void) {
  cancelPending = cancel;
  return () => {
    if (cancelPending === cancel) cancelPending = null;
  };
}

export function cancelEditSession() {
  cancelPending?.();
  dirty = false;
}

export function confirmDiscard(message: string) {
  if (!dirty) return true;
  const ok = window.confirm(message);
  if (ok) cancelEditSession();
  return ok;
}
