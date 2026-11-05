"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "./Avatar";

type LoginUser = { id: number; name: string; email: string; avatarColor: string };

export function LoginCards({ users, currentUserId }: { users: LoginUser[]; currentUserId?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(userId: number) {
    setPending(userId);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Login failed");
      // Only follow same-origin relative paths to avoid an open redirect.
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => login(u.id)}
          disabled={pending !== null}
          className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
        >
          <Avatar name={u.name} color={u.avatarColor} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-slate-900">{u.name}</span>
            <span className="block truncate text-sm text-slate-500">{u.email}</span>
          </span>
          <span className="text-sm text-slate-400">
            {pending === u.id ? "Signing in…" : u.id === currentUserId ? "Current" : "Continue →"}
          </span>
        </button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
