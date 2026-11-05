import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { listDocumentsFor } from "@/lib/documents";
import { EMPTY_DOC } from "@/lib/validation";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  return NextResponse.json(await listDocumentsFor(auth.user));
}

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const [doc] = await db
    .insert(documents)
    .values({ ownerId: auth.user.id, title: "Untitled document", content: EMPTY_DOC })
    .returning();
  return NextResponse.json({ document: doc }, { status: 201 });
}
