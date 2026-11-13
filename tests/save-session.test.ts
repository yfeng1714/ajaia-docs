import { beforeEach, expect, it } from "vitest";
import { runDocumentSave, type SaveController, type SaveResult, type SaveStatus } from "../src/lib/client/document-save";
import {
  cancelEditSession,
  getEditorDirty,
  pauseEditing,
  registerEditSession,
  resumeEditing,
  setSaveInFlight,
  setUnsavedWork,
} from "../src/lib/client/dirty";
import { switchDemoUser } from "../src/lib/client/switch-user";
import type { EditorDoc } from "../src/lib/content";

const emptyDoc: EditorDoc = { type: "doc", content: [{ type: "paragraph" }] };

beforeEach(() => {
  setUnsavedWork(false);
  setSaveInFlight(false);
});

function harness(send: SaveController["send"]) {
  const status: SaveStatus = { kind: "dirty" };
  const state = {
    displayedTitle: "Title A",
    status,
    controller: {
      documentId: "review-doc",
      canRename: true,
      titleRef: { current: "Title A" },
      contentRef: { current: emptyDoc },
      revisionRef: { current: 1 },
      dirtyRef: { current: true },
      savingRef: { current: false },
      ignoreRef: { current: false as boolean },
      pausedRef: { current: false as boolean },
      timerRef: { current: null },
      getStatus: () => status.kind,
      setStatus: (next: SaveStatus) => {
        Object.assign(status, next);
      },
      setTitle: (title: string) => {
        state.displayedTitle = title;
      },
      send,
    } satisfies SaveController,
  };
  setUnsavedWork(true);
  return state;
}

it("keeps a newer title typed while the first save is in flight", async () => {
  const requests: Array<{ title?: string; expectedRevision: number }> = [];
  let resolveFirst: (result: SaveResult) => void = () => {};
  const first = new Promise<SaveResult>((resolve) => {
    resolveFirst = resolve;
  });
  const state = harness(async (body) => {
    requests.push(body);
    if (requests.length === 1) return first;
    return {
      ok: true,
      data: { document: { title: body.title ?? "", revision: 3, updatedAt: "2026-11-13T22:00:00.000Z" } },
    };
  });

  const pending = runDocumentSave(state.controller);
  expect(state.status.kind).toBe("saving");
  expect(state.controller.savingRef.current).toBe(true);
  expect(getEditorDirty()).toBe(true);

  state.controller.titleRef.current = "Title B typed during save";
  state.displayedTitle = state.controller.titleRef.current;
  state.controller.dirtyRef.current = true;
  setUnsavedWork(true);

  resolveFirst({
    ok: true,
    data: { document: { title: "Title A", revision: 2, updatedAt: "2026-11-13T22:00:00.000Z" } },
  });
  await pending;

  expect(requests[1]?.title).toBe("Title B typed during save");
  expect(state.displayedTitle).toBe("Title B typed during save");
  expect(state.status.kind).toBe("saved");
  expect(getEditorDirty()).toBe(false);
});

it("keeps navigation protection until the latest draft is saved", async () => {
  let resolveSave: (result: SaveResult) => void = () => {};
  const state = harness(
    () =>
      new Promise<SaveResult>((resolve) => {
        resolveSave = resolve;
      }),
  );

  const pending = runDocumentSave(state.controller);
  expect(getEditorDirty()).toBe(true);

  resolveSave({ ok: false, error: "The server did not respond." });
  await pending;
  expect(state.status.kind).toBe("error");
  expect(getEditorDirty()).toBe(true);

  state.controller.send = async (body) => ({
    ok: true,
    data: { document: { title: body.title ?? "", revision: 2, updatedAt: "2026-11-13T22:00:00.000Z" } },
  });
  state.controller.dirtyRef.current = true;
  await runDocumentSave(state.controller);
  expect(state.status.kind).toBe("saved");
  expect(getEditorDirty()).toBe(false);
});

it("restores saving when an identity switch fails", async () => {
  const requests: string[] = [];
  const state = harness(async (body) => {
    requests.push(body.title ?? "");
    return {
      ok: true,
      data: { document: { title: body.title ?? "", revision: 2, updatedAt: "2026-11-13T22:00:00.000Z" } },
    };
  });
  const unregister = registerEditSession({
    pause: () => {
      state.controller.pausedRef.current = true;
    },
    resume: () => {
      state.controller.pausedRef.current = false;
    },
    cancel: () => {
      state.controller.ignoreRef.current = true;
    },
  });

  let error = "";
  await switchDemoUser({
    userId: "other-demo-user",
    blocked: true,
    confirm: () => true,
    pause: pauseEditing,
    resume: resumeEditing,
    cancel: cancelEditSession,
    postSession: async () => ({ ok: false, error: "Network error" }),
    onStart: () => {},
    onError: (message) => {
      error = message;
    },
    onSuccess: () => {
      throw new Error("switch should not succeed");
    },
  });

  expect(error).toBe("Network error");
  expect(state.controller.ignoreRef.current).toBe(false);
  expect(state.controller.pausedRef.current).toBe(false);
  state.controller.dirtyRef.current = true;
  state.controller.titleRef.current = "Draft kept";
  await runDocumentSave(state.controller);
  expect(requests).toEqual(["Draft kept"]);
  unregister();
});
