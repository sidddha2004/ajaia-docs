"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toaster";

export function NewDocButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/documents", { method: "POST" });
      if (!res.ok) throw new Error("Couldn't create the document");
      const { document } = await res.json();
      router.push(`/doc/${document.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't create the document");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={create}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
    >
      <span aria-hidden className="text-base leading-none">
        +
      </span>
      {busy ? "Creating…" : "New document"}
    </button>
  );
}
