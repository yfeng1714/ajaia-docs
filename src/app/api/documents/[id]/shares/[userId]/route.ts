import { revokeAccess } from "@/lib/documents";
import { errorResponse } from "@/lib/http";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id, userId } = await context.params;
    const people = await revokeAccess(user.id, id, userId);
    return Response.json({ people });
  } catch (error) {
    return errorResponse(error);
  }
}
