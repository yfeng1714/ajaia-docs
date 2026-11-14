import Link from "next/link";
import { ChooseUser } from "@/components/choose-user";
import { DocumentEditor } from "@/components/document-editor";
import { getDocument, listShareCandidates } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/session";
import type { DocumentDetail, ShareCandidate } from "@/lib/types";
import { listPeople } from "@/lib/users";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    const people = await listPeople();
    return <ChooseUser people={people} note="Choose a person to open this document if they have access." />;
  }

  let document: DocumentDetail | null = null;
  let candidates: ShareCandidate[] = [];
  let unavailable = false;
  try {
    document = await getDocument(user.id, id);
    candidates = document.canShare ? await listShareCandidates(user.id, id) : [];
  } catch (error) {
    if (error instanceof AppError && error.status === 404) unavailable = true;
    else throw error;
  }

  if (unavailable || !document) {
    return (
      <section className="panel">
        <h1>This document isn&apos;t available</h1>
        <p>
          It may not exist, or {user.displayName} doesn&apos;t have access. Choose another demo user, or return to the
          library.
        </p>
        <Link className="back-link" href="/">
          ← All documents
        </Link>
      </section>
    );
  }

  return <DocumentEditor key={`${user.id}:${document.id}`} doc={document} candidates={candidates} />;
}
