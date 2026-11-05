"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCEPT_ATTR, MAX_IMPORT_BYTES, SUPPORTED_EXTENSIONS, SUPPORTED_LABEL } from "@/lib/importConfig";
import { useToast } from "./Toaster";

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    // Quick client-side checks; the server re-validates everything.
    const ext = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
    if (![...SUPPORTED_EXTENSIONS, ".markdown"].includes(ext)) {
      toast(`Unsupported file type${ext ? ` (${ext})` : ""}. Use ${SUPPORTED_EXTENSIONS.join(", ")}.`);
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      toast("File is too large (max 2 MB)");
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Import failed");
      toast(`Imported "${body.document.title}"`, "success");
      router.push(`/doc/${body.document.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-slate-500 sm:inline">{SUPPORTED_LABEL}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? "Importing…" : "Import file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        aria-label="Import a .txt, .md or .docx file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow re-selecting the same file
          if (file) void onFile(file);
        }}
      />
    </div>
  );
}
