import Link from "next/link";
import type { User } from "@/db/schema";
import { UserMenu } from "./UserMenu";

export function AppHeader({ user, children }: { user: User; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="font-semibold text-slate-900">
          Ajaia Docs
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        <UserMenu name={user.name} avatarColor={user.avatarColor} />
      </div>
    </header>
  );
}
