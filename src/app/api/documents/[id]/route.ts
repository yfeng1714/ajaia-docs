import { getDocument, updateDocument } from "@/lib/documents";
import { errorResponse, readJson } from "@/lib/http";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const document = await getDocument(user.id, id);
    return Response.json({ document });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await readJson(request);
    const document = await updateDocument(user.id, id, {
      expectedRevision: body.expectedRevision,
      ...("title" in body ? { title: body.title } : {}),
      ...("content" in body ? { content: body.content } : {}),
    });
    return Response.json({ document });
  } catch (error) {
    return errorResponse(error);
  }
}
