import type { EditorDoc } from "./content";

export type PublicUser = {
  id: string;
  displayName: string;
  email: string;
};

export type ShareCandidate = PublicUser & {
  shared: boolean;
};

export type DocumentRole = "owner" | "editor";

export type DocumentSummary = {
  id: string;
  title: string;
  ownerName: string;
  updatedAt: string;
  role: DocumentRole;
};

export type DocumentDetail = DocumentSummary & {
  ownerId: string;
  content: EditorDoc;
  revision: number;
  canRename: boolean;
  canShare: boolean;
};
