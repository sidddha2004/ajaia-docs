import type { Metadata } from "next";
import type { JSONContent } from "@tiptap/react";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getDocAccess } from "@/lib/documents";
import { AppHeader } from "@/components/AppHeader";
import { Editor } from "@/components/Editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const access = user ? await getDocAccess(user, id, "viewer") : null;
  return { title: access?.ok ? `${access.doc.title} · Ajaia Docs` : "Ajaia Docs" };
}

export default async function DocPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/doc/${encodeURIComponent(id)}`);

  const access = await getDocAccess(user, id, "viewer");
  if (!access.ok) notFound();
  const { doc, role } = access;

  const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, doc.ownerId));

  return (
    <>
      <AppHeader user={user} />
      <Editor
        // Remount when switching docs so editor state never leaks between them.
        key={doc.id}
        docId={doc.id}
        initialTitle={doc.title}
        initialContent={doc.content as JSONContent}
        role={role}
        ownerName={owner?.name ?? "the owner"}
      />
    </>
  );
}
