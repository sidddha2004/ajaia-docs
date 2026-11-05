"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DocListItem } from "@/lib/documents";
import { formatRelative } from "@/lib/format";
import { RoleBadge } from "./RoleBadge";
import { useToast } from "./Toaster";

type Tab = "owned" | "shared";

export function DocList({ owned, shared }: { owned: DocListItem[]; shared: DocListItem[] }) {
  const [tab, setTab] = useState<Tab>("owned");
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const items = tab === "owned" ? owned : shared;

  async function remove(doc: DocListItem) {
    if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    setDeleting(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't delete");
      toast("Document deleted", "success");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete");
    } finally {
      setDeleting(null);
    }
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "owned", label: "My documents", count: owned.length },
    { key: "shared", label: "Shared with me", count: shared.length },
  ];

  return (
    <section>
      <div role="tablist" className="flex gap-6 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition ${
              tab === t.key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t.count}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="font-medium text-slate-700">
            {tab === "owned" ? "No documents yet" : "Nothing shared with you yet"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {tab === "owned"
              ? "Create a new document or import a file to get started."
              : "When someone shares a document with you, it will show up here."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((d) => (
            <li key={d.id} className="group flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
              <Link href={`/doc/${d.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <DocIcon />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{d.title}</span>
                  <span className="block text-xs text-slate-500" suppressHydrationWarning>
                    {tab === "shared" && <>Owned by {d.ownerName} · </>}
                    Edited {formatRelative(d.updatedAt)}
                  </span>
                </span>
              </Link>
              <RoleBadge role={d.role} />
              {d.role === "owner" && (
                <button
                  type="button"
                  onClick={() => remove(d)}
                  disabled={deleting === d.id}
                  aria-label={`Delete ${d.title}`}
                  className="rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                >
                  {deleting === d.id ? "Deleting…" : "Delete"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DocIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8 shrink-0 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="currentColor" fillOpacity={0.08} />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}
