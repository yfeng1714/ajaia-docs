import { COOKIE_NAME } from "@/lib/constants";
import { errorResponse, readJson } from "@/lib/http";
import { sessionCookieOptions } from "@/lib/session";
import { findUser, isUuid, listPeople } from "@/lib/users";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const jar = await cookies();
    const id = jar.get(COOKIE_NAME)?.value;
    const user = id && isUuid(id) ? await findUser(id) : null;
    const people = await listPeople();
    return Response.json({ user, people });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const userId = body.userId;
    if (typeof userId !== "string" || !isUuid(userId)) {
      return Response.json({ error: "Choose a demo user." }, { status: 400 });
    }
    const user = await findUser(userId);
    if (!user) return Response.json({ error: "That demo user does not exist." }, { status: 400 });
    const jar = await cookies();
    jar.set(COOKIE_NAME, user.id, sessionCookieOptions());
    return Response.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
