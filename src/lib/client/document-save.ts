import { setSaveInFlight, setUnsavedWork } from "@/lib/client/dirty";
import type { EditorDoc } from "@/lib/content";
import type { DocumentDetail } from "@/lib/types";

export type SaveStatus =
  | { kind: "saved"; updatedAt: string }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

export type SaveResult =
  | { ok: true; data: { document: Pick<DocumentDetail, "title" | "revision" | "updatedAt"> } }
  | { ok: false; error: string; code?: string };

export type SaveController = {
  documentId: string;
  canRename: boolean;
  titleRef: { current: string };
  contentRef: { current: EditorDoc };
  revisionRef: { current: number };
  dirtyRef: { current: boolean };
  savingRef: { current: boolean };
  ignoreRef: { current: boolean };
  pausedRef: { current: boolean };
  timerRef: { current: number | null };
  getStatus: () => SaveStatus["kind"];
  setStatus: (status: SaveStatus) => void;
  setTitle: (title: string) => void;
  send: (body: { expectedRevision: number; content: EditorDoc; title?: string }) => Promise<SaveResult>;
};

function syncGuard(controller: SaveController) {
  if (controller.ignoreRef.current) return;
  setUnsavedWork(controller.dirtyRef.current);
  setSaveInFlight(controller.savingRef.current);
}

export async function runDocumentSave(controller: SaveController): Promise<void> {
  if (controller.ignoreRef.current || controller.pausedRef.current) return;
  if (controller.getStatus() === "conflict") return;
  if (controller.savingRef.current) {
    controller.dirtyRef.current = true;
    syncGuard(controller);
    return;
  }
  if (!controller.dirtyRef.current) return;

  if (controller.canRename) {
    const trimmed = controller.titleRef.current.trim();
    if (!trimmed || trimmed.length > 120) {
      controller.dirtyRef.current = true;
      syncGuard(controller);
      controller.setStatus({
        kind: "error",
        message: trimmed ? "Titles can be at most 120 characters." : "Give the document a title.",
      });
      return;
    }
  }

  if (controller.timerRef.current !== null) {
    clearTimeout(controller.timerRef.current);
    controller.timerRef.current = null;
  }

  const submittedTitle = controller.titleRef.current;
  const submittedContent = controller.contentRef.current;
  controller.savingRef.current = true;
  controller.dirtyRef.current = false;
  syncGuard(controller);
  controller.setStatus({ kind: "saving" });

  const result = await controller.send({
    expectedRevision: controller.revisionRef.current,
    content: submittedContent,
    ...(controller.canRename ? { title: submittedTitle } : {}),
  });

  controller.savingRef.current = false;
  if (controller.ignoreRef.current) return;
  if (!result.ok) {
    controller.dirtyRef.current = true;
    syncGuard(controller);
    controller.setStatus(
      result.code === "stale_revision"
        ? { kind: "conflict", message: result.error }
        : { kind: "error", message: result.error },
    );
    return;
  }

  controller.revisionRef.current = result.data.document.revision;
  const titleChanged = controller.canRename && controller.titleRef.current !== submittedTitle;
  if (controller.canRename && !titleChanged) {
    controller.titleRef.current = result.data.document.title;
    controller.setTitle(result.data.document.title);
  }
  if (titleChanged) controller.dirtyRef.current = true;

  if (controller.pausedRef.current) {
    syncGuard(controller);
    return;
  }
  if (controller.dirtyRef.current) {
    syncGuard(controller);
    await runDocumentSave(controller);
    return;
  }
  syncGuard(controller);
  controller.setStatus({ kind: "saved", updatedAt: result.data.document.updatedAt });
}
