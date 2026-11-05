import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDocumentsFor } from "@/lib/documents";
import { AppHeader } from "@/components/AppHeader";
import { DocList } from "@/components/DocList";
import { NewDocButton } from "@/components/NewDocButton";
import { ImportButton } from "@/components/ImportButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocumentsFor(user);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-slate-900">Documents</h1>
          <div className="flex flex-wrap items-center gap-3">
            <ImportButton />
            <NewDocButton />
          </div>
        </div>
        <DocList owned={owned} shared={shared} />
      </main>
    </>
  );
}
