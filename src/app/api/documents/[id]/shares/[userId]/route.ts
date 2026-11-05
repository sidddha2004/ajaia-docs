import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documentShares } from "@/db/schema";
import { requireDocAccess } from "@/lib/api";
import { jsonError } from "@/lib/http";
import { listShares } from "@/lib/shares";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, userId } = await params;
  const access = await requireDocAccess(id, "owner");
  if (!access.ok) return access.response;

  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0) return jsonError(400, "Invalid user id");

  const removed = await db
    .delete(documentShares)
    .where(and(eq(documentShares.documentId, id), eq(documentShares.userId, uid)))
    .returning({ userId: documentShares.userId });
  if (removed.length === 0) return jsonError(404, "That person doesn't have access");

  return NextResponse.json({ shares: await listShares(id) });
}
