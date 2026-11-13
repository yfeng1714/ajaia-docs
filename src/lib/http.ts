import { AppError } from "./errors";

export async function readJson(request: Request) {
  const declared = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > 1_000_000) {
    throw new AppError("That document is too large to save.", 413);
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AppError("The request was not valid.", 400);
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("The request was not valid JSON.", 400);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, ...(error.code ? { code: error.code } : {}) },
      { status: error.status },
    );
  }
  console.error(error);
  return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
