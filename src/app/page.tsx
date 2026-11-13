import { ChooseUser } from "@/components/choose-user";
import { DocumentSection } from "@/components/document-section";
import { LibraryActions } from "@/components/library-actions";
import { listDocuments } from "@/lib/documents";
import { getCurrentUser } from "@/lib/session";
import { listPeople } from "@/lib/users";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    const people = await listPeople();
    return <ChooseUser people={people} />;
  }
  const library = await listDocuments(user.id);

  return (
    <div className="library">
      <div className="library-head">
        <div>
          <h1>Documents</h1>
          <p className="lede">Documents you own stay separate from documents shared with you.</p>
        </div>
        <LibraryActions />
      </div>
      <DocumentSection
        title="Owned by you"
        empty="You have not created a document yet. Start one, or import a .txt file."
        documents={library.owned}
      />
      <DocumentSection
        title="Shared with me"
        empty="No one has shared a document with you yet."
        documents={library.shared}
        shared
      />
    </div>
  );
}
