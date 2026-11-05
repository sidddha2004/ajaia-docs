import type { Role } from "@/lib/access";

const styles: Record<Role, string> = {
  owner: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  editor: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  viewer: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${styles[role]}`}
    >
      {role}
    </span>
  );
}
