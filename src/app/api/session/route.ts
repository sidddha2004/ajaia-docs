import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { jsonError } from "@/lib/http";

const loginSchema = z.object({ userId: z.number().int().positive() });

// Mocked auth: pick one of the seeded users. No password, but the cookie is
// signed, so a client can't forge a session for someone else.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid request body");

  const [user] = await db.select().from(users).where(eq(users.id, parsed.data.userId)).limit(1);
  if (!user) return jsonError(404, "User not found");

  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, await signSession({ uid: user.id }), sessionCookieOptions);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return res;
}
