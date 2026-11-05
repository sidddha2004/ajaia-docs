import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { documentShares, documents, users, type Document, type User } from "@/db/schema";
import { resolveRole, hasRole, type Role } from "./access";
import { uuidSchema } from "./validation";

export type DocListItem = {
  id: string;
  title: string;
  updatedAt: string;
  ownerName: string;
  role: Role;
};

export async function listDocumentsFor(user: User): Promise<{ owned: DocListItem[]; shared: DocListItem[] }> {
  const [ownedRows, sharedRows] = await Promise.all([
    db
      .select({ id: documents.id, title: documents.title, updatedAt: documents.updatedAt })
      .from(documents)
      .where(eq(documents.ownerId, user.id))
      .orderBy(desc(documents.updatedAt)),
    db
      .select({
        id: documents.id,
        title: documents.title,
        updatedAt: documents.updatedAt,
        ownerName: users.name,
        role: documentShares.role,
      })
      .from(documentShares)
      .innerJoin(documents, eq(documents.id, documentShares.documentId))
      .innerJoin(users, eq(users.id, documents.ownerId))
      .where(eq(documentShares.userId, user.id))
      .orderBy(desc(documents.updatedAt)),
  ]);

  return {
    owned: ownedRows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString(), ownerName: user.name, role: "owner" })),
    shared: sharedRows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
  };
}

export type AccessResult =
  | { ok: true; doc: Document; role: Role }
  | { ok: false; status: 404 | 403 };

/**
 * Loads a document and the caller's role. No access → 404 (so we don't reveal
 * that the document exists); access but too low a role → 403.
 */
export async function getDocAccess(user: User, docId: string, minRole: Role): Promise<AccessResult> {
  if (!uuidSchema.safeParse(docId).success) return { ok: false, status: 404 };

  const [doc] = await db.select().from(documents).where(eq(documents.id, docId)).limit(1);
  if (!doc) return { ok: false, status: 404 };

  const shares =
    doc.ownerId === user.id
      ? []
      : await db
          .select({ userId: documentShares.userId, role: documentShares.role })
          .from(documentShares)
          .where(and(eq(documentShares.documentId, docId), eq(documentShares.userId, user.id)));

  const role = resolveRole(user.id, doc, shares);
  if (!role) return { ok: false, status: 404 };
  if (!hasRole(role, minRole)) return { ok: false, status: 403 };
  return { ok: true, doc, role };
}
