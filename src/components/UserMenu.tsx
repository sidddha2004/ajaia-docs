"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";

export function UserMenu({ name, avatarColor }: { name: string; avatarColor: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} color={avatarColor} size="sm" />
      <span className="hidden text-sm font-medium text-slate-700 sm:inline">{name}</span>
      <Link href="/login" className="text-sm text-indigo-600 hover:underline">
        Switch user
      </Link>
      <button type="button" onClick={logout} className="text-sm text-slate-500 hover:text-slate-800">
        Log out
      </button>
    </div>
  );
}
