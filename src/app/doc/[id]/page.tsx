import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDocAccess } from "@/lib/documents";
import { AppHeader } from "@/components/AppHeader";
import { RoleBadge } from "@/components/RoleBadge";

export const dynamic = "force-dynamic";

// Stub until the editor lands in build step 4. Access checks are already real.
export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/doc/${encodeURIComponent(id)}`);

  const access = await getDocAccess(user, id, "viewer");
  if (!access.ok) notFound();
  const { doc, role } = access;

  return (
    <>
      <AppHeader user={user}>
        <div className="flex items-center gap-3">
          <span className="truncate text-sm text-slate-600">{doc.title}</span>
          <RoleBadge role={role} />
        </div>
      </AppHeader>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">{doc.title}</h1>
        <p className="mt-4 text-slate-500">The editor arrives in the next build step.</p>
      </main>
    </>
  );
}
