import Link from "next/link";
import { formatTimestamp } from "@/lib/format";
import type { DocumentSummary } from "@/lib/types";

export function DocumentSection({
  title,
  empty,
  documents,
  shared = false,
}: {
  title: string;
  empty: string;
  documents: DocumentSummary[];
  shared?: boolean;
}) {
  return (
    <section className="doc-section">
      <h2>{title}</h2>
      {documents.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <div className="doc-list">
          {documents.map((document) => (
            <Link key={document.id} href={`/documents/${document.id}`} className="doc-row">
              <span>
                <strong>{document.title}</strong>
                <small>{shared ? `From ${document.ownerName}` : "You own this"}</small>
              </span>
              <time dateTime={document.updatedAt}>{formatTimestamp(document.updatedAt)}</time>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
