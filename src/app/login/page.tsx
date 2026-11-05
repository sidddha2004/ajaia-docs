import { Suspense } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { LoginCards } from "@/components/LoginCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in · Ajaia Docs" };

export default async function LoginPage() {
  const [all, current] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, avatarColor: users.avatarColor })
      .from(users)
      .orderBy(asc(users.id)),
    getCurrentUser(),
  ]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Ajaia Docs</h1>
          <p className="mt-1 text-slate-500">Choose a user to continue</p>
        </div>
        <Suspense>
          <LoginCards users={all} currentUserId={current?.id} />
        </Suspense>
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Authentication is mocked for this demo: pick any seeded user. Sessions are still stored in a
          signed, httpOnly cookie, so they can&apos;t be forged.
        </p>
      </div>
    </main>
  );
}
