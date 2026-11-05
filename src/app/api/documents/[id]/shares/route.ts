import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documentShares, users } from "@/db/schema";
import { requireDocAccess } from "@/lib/api";
import { jsonError } from "@/lib/http";
import { listShares } from "@/lib/shares";
import { firstIssue, shareSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// Managing access is owner-only, including seeing the access list.
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireDocAccess(id, "owner");
  if (!access.ok) return access.response;
  return NextResponse.json({ shares: await listShares(id) });
}

/** Share by email. Sharing again with the same person updates their role. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireDocAccess(id, "owner");
  if (!access.ok) return access.response;

  const parsed = shareSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, firstIssue(parsed.error));
  const { email, role } = parsed.data;

  const [target] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!target) return jsonError(404, `No user with the email ${email}`);
  if (target.id === access.user.id) return jsonError(400, "You already own this document");

  const [existing] = await db
    .select({ role: documentShares.role })
    .from(documentShares)
    .where(and(eq(documentShares.documentId, id), eq(documentShares.userId, target.id)))
    .limit(1);

  await db
    .insert(documentShares)
    .values({ documentId: id, userId: target.id, role })
    .onConflictDoUpdate({ target: [documentShares.documentId, documentShares.userId], set: { role } });

  return NextResponse.json(
    { shares: await listShares(id), updated: Boolean(existing) },
    { status: existing ? 200 : 201 },
  );
}
