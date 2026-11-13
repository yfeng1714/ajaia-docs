import { importTextDocument } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import { errorResponse } from "@/lib/http";
import { requireUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const declared = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(declared) && declared > 2_000_000) {
      throw new AppError("This file is larger than 256 KB. Shorten it and try again.", 413);
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Choose a .txt file to import.", 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const document = await importTextDocument(user.id, { filename: file.name, bytes });
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
