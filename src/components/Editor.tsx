"use client";

import { useCallback, useEffect, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import type { Role } from "@/lib/access";
import { useAutosave, type SaveStatus } from "@/hooks/useAutosave";
import { Toolbar } from "./Toolbar";
import { RoleBadge } from "./RoleBadge";

const DEFAULT_TITLE = "Untitled document";

type Props = {
  docId: string;
  initialTitle: string;
  initialContent: JSONContent;
  role: Role;
  ownerName: string;
  /** Rendered next to the save status, e.g. the Share button. */
  actions?: React.ReactNode;
};

export function Editor({ docId, initialTitle, initialContent, role, ownerName, actions }: Props) {
  const canEdit = role !== "viewer";
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    document.title = `${title.trim() || DEFAULT_TITLE} · Ajaia Docs`;
  }, [title]);

  const save = useCallback(
    async (patch: Record<string, unknown>, { keepalive }: { keepalive?: boolean }) => {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        keepalive,
      });
      if (res.ok) return;
      if (res.status === 403) throw new Error("You no longer have edit access");
      if (res.status === 404) throw new Error("This document no longer exists");
      throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't save");
    },
    [docId],
  );
  const { status, error, schedule, retry } = useAutosave({ save });

  const editor = useEditor({
    immediatelyRender: false, // avoid SSR hydration mismatch
    editable: canEdit,
    extensions: [
      // Links and code blocks are out of scope; turning links off also avoids
      // having to vet user-supplied hrefs.
      StarterKit.configure({ link: false, codeBlock: false, heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: canEdit ? "Start writing…" : "This document is empty." }),
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: "tiptap-content", "aria-label": "Document body" },
    },
    onUpdate: ({ editor: e }) => schedule({ content: e.getJSON() }),
  });

  function onTitleChange(value: string) {
    setTitle(value);
    if (value.trim()) schedule({ title: value.trim().slice(0, 200) });
  }

  function onTitleBlur() {
    if (!title.trim()) {
      setTitle(DEFAULT_TITLE);
      schedule({ title: DEFAULT_TITLE });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24">
      <div className="flex flex-wrap items-center gap-3 pt-6">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!editor) return;
              // Focus synchronously: commands.focus() defers to rAF, which can
              // let the next keystrokes land in the title instead.
              editor.view.focus();
              editor.commands.focus("start");
            }
          }}
          readOnly={!canEdit}
          maxLength={200}
          aria-label="Document title"
          placeholder={DEFAULT_TITLE}
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-2xl font-semibold text-slate-900 outline-none hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 read-only:hover:bg-transparent read-only:focus:ring-0"
        />
        <div className="flex items-center gap-3">
          {canEdit && <SaveIndicator status={status} error={error} onRetry={retry} />}
          <RoleBadge role={role} />
          {actions}
        </div>
      </div>

      {!canEdit && (
        <div role="status" className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have view-only access to this document, shared by {ownerName}.
        </div>
      )}

      {canEdit && editor && (
        <div className="sticky top-14 z-10 -mx-1 mt-4 bg-slate-50/90 px-1 py-2 backdrop-blur">
          <Toolbar editor={editor} />
        </div>
      )}

      <div className="mt-4 min-h-[60vh] rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-12 sm:py-10">
        {editor ? <EditorContent editor={editor} /> : <EditorSkeleton />}
      </div>
    </div>
  );
}

function SaveIndicator({ status, error, onRetry }: { status: SaveStatus; error: string | null; onRetry: () => void }) {
  if (status === "error") {
    return (
      <span role="alert" className="flex items-center gap-2 text-sm text-red-600">
        {error ?? "Couldn't save"}
        <button type="button" onClick={onRetry} className="font-medium underline hover:no-underline">
          Retry
        </button>
      </span>
    );
  }
  const text = { idle: "All changes saved", pending: "Unsaved changes", saving: "Saving…", saved: "Saved" }[status];
  return (
    <span aria-live="polite" className="text-sm text-slate-500">
      {text}
    </span>
  );
}

function EditorSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-3/4 rounded bg-slate-200" />
      <div className="h-4 w-5/6 rounded bg-slate-200" />
      <div className="h-4 w-2/3 rounded bg-slate-200" />
    </div>
  );
}
