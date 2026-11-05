import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/http";
import { ImportError, importFile, MAX_IMPORT_BYTES } from "@/lib/import";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  // Reject obviously oversized uploads before buffering the whole body.
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMPORT_BYTES + 64 * 1024) return jsonError(413, "File is too large (max 2 MB)");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError(400, "Attach a file in the 'file' field");

  try {
    const { title, content } = await importFile({
      name: file.name,
      size: file.size,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    const [doc] = await db
      .insert(documents)
      .values({ ownerId: auth.user.id, title, content })
      .returning({ id: documents.id, title: documents.title });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e) {
    if (e instanceof ImportError) return jsonError(e.status, e.message);
    console.error("Import failed", e);
    return jsonError(500, "Import failed");
  }
}
