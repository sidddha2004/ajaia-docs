import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { documentShares, users } from "@/db/schema";

export type ShareEntry = {
  userId: number;
  name: string;
  email: string;
  avatarColor: string;
  role: "editor" | "viewer";
};

export async function listShares(docId: string): Promise<ShareEntry[]> {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      role: documentShares.role,
    })
    .from(documentShares)
    .innerJoin(users, eq(users.id, documentShares.userId))
    .where(eq(documentShares.documentId, docId))
    .orderBy(asc(documentShares.createdAt));
}
