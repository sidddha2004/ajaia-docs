import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { requireDocAccess } from "@/lib/api";
import { jsonError } from "@/lib/http";
import { firstIssue, patchDocumentSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireDocAccess(id, "viewer");
  if (!access.ok) return access.response;

  const [owner] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, access.doc.ownerId));
  return NextResponse.json({ document: access.doc, role: access.role, owner });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireDocAccess(id, "editor");
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => null);
  const parsed = patchDocumentSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, firstIssue(parsed.error));

  // Last write wins: no real-time merge (documented cut).
  const [doc] = await db
    .update(documents)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning({ id: documents.id, title: documents.title, updatedAt: documents.updatedAt });
  return NextResponse.json({ document: doc });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const access = await requireDocAccess(id, "owner");
  if (!access.ok) return access.response;

  await db.delete(documents).where(eq(documents.id, id)); // shares cascade
  return new NextResponse(null, { status: 204 });
}
