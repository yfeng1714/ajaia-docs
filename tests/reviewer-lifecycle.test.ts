import { beforeEach, expect, it } from "vitest";
import { runDocumentSave, type SaveController, type SaveResult, type SaveStatus } from "../src/lib/client/document-save";
import { cancelEditSession, getEditorDirty, registerEditSession, setSaveInFlight, setUnsavedWork } from "../src/lib/client/dirty";

beforeEach(() => {
  setUnsavedWork(false);
  setSaveInFlight(false);
});

function pendingController(id: string, outcome: SaveResult) {
  let resolve: (result: SaveResult) => void = () => {};
  const response = new Promise<SaveResult>((done) => {
    resolve = done;
  });
  let status: SaveStatus = { kind: "dirty" };
  const controller: SaveController = {
    documentId: id,
    canRename: true,
    titleRef: { current: id },
    contentRef: { current: { type: "doc", content: [{ type: "paragraph" }] } },
    revisionRef: { current: 1 },
    dirtyRef: { current: true },
    savingRef: { current: false },
    ignoreRef: { current: false },
    pausedRef: { current: false },
    timerRef: { current: null },
    getStatus: () => status.kind,
    setStatus: (next) => {
      status = next;
    },
    setTitle: () => {},
    send: () => response,
  };
  return { controller, resolve: () => resolve(outcome) };
}

async function discardedSaveThenNewPendingSave(outcome: SaveResult) {
  const old = pendingController("old-document", outcome);
  const unregister = registerEditSession({
    pause: () => {},
    resume: () => {},
    cancel: () => {
      old.controller.ignoreRef.current = true;
    },
  });
  const first = runDocumentSave(old.controller);
  expect(getEditorDirty()).toBe(true);
  cancelEditSession();
  unregister();

  const next = pendingController("new-document", {
    ok: true,
    data: { document: { title: "new-document", revision: 2, updatedAt: "2026-11-13T23:00:00Z" } },
  });
  const second = runDocumentSave(next.controller);
  expect(next.controller.savingRef.current).toBe(true);
  expect(getEditorDirty()).toBe(true);

  old.resolve();
  await first;
  const guarded = getEditorDirty();
  const stillPending = next.controller.savingRef.current;
  next.resolve();
  await second;
  return { guarded, stillPending };
}

it("a discarded old save must not clear a new document's pending-save guard", async () => {
  const observed = await discardedSaveThenNewPendingSave({
    ok: true,
    data: { document: { title: "old-document", revision: 2, updatedAt: "2026-11-13T23:00:00Z" } },
  });
  expect(observed.stillPending).toBe(true);
  expect(observed.guarded).toBe(true);
});

it("a discarded old failure must not clear a new document's pending-save guard", async () => {
  const observed = await discardedSaveThenNewPendingSave({ ok: false, error: "The server did not respond." });
  expect(observed.stillPending).toBe(true);
  expect(observed.guarded).toBe(true);
});
