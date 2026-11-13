import { cache } from "react";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "./constants";
import { AppError } from "./errors";
import { findUser, isUuid } from "./users";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const id = jar.get(COOKIE_NAME)?.value;
  if (!id || !isUuid(id)) return null;
  return findUser(id);
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Choose a demo user before continuing.", 401);
  return user;
}
