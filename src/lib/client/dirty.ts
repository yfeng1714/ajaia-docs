let unsaved = false;
let inFlight = false;

type EditSession = {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
};

let session: EditSession | null = null;

export function setUnsavedWork(value: boolean) {
  unsaved = value;
}

export function setSaveInFlight(value: boolean) {
  inFlight = value;
}

export function getEditorDirty() {
  return unsaved || inFlight;
}

export function registerEditSession(next: EditSession) {
  session = next;
  return () => {
    if (session === next) session = null;
  };
}

export function pauseEditing() {
  session?.pause();
}

export function resumeEditing() {
  session?.resume();
}

export function cancelEditSession() {
  session?.cancel();
  unsaved = false;
  inFlight = false;
}

export function confirmLeave(message: string) {
  if (!getEditorDirty()) return true;
  return window.confirm(message);
}
