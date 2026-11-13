import { grantAccess, listShareCandidates } from "@/lib/documents";
import { errorResponse, readJson } from "@/lib/http";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const people = await listShareCandidates(user.id, id);
    return Response.json({ people });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await readJson(request);
    if (typeof body.userId !== "string") {
      return Response.json({ error: "Choose a person to share with." }, { status: 400 });
    }
    const people = await grantAccess(user.id, id, body.userId);
    return Response.json({ people });
  } catch (error) {
    return errorResponse(error);
  }
}
