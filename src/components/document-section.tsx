import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import type { DocumentSummary } from "@/lib/types";

export function DocumentSection({
  title,
  empty,
  documents,
}: {
  title: string;
  empty: string;
  documents: DocumentSummary[];
}) {
  return (
    <section className="doc-section">
      <h2>
        {title}
        <span className="section-count">{documents.length}</span>
      </h2>
      {documents.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <div className="doc-list">
          {documents.map((document) => (
            <Link key={document.id} href={`/documents/${document.id}`} className="doc-row">
              <span className="doc-row-copy">
                <strong>{document.title}</strong>
                <span className="doc-meta">
                  <span>
                    Owner: {document.ownerName}
                    {document.role === "owner" ? " (you)" : ""}
                  </span>
                  {document.role === "editor" ? <span className="badge">Can edit</span> : null}
                </span>
              </span>
              <LocalTime iso={document.updatedAt} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
