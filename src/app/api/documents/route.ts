import { createDocument, listDocuments } from "@/lib/documents";
import { errorResponse, readJson } from "@/lib/http";
import { requireUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireUser();
    const library = await listDocuments(user.id);
    return Response.json(library);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    const title = typeof body.title === "string" ? body.title : undefined;
    const document = await createDocument(user.id, title);
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
