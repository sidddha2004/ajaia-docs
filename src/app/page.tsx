import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

// Placeholder until the dashboard lands in build step 3.
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="mt-2 text-slate-500">Your documents will appear here.</p>
      </main>
    </>
  );
}
