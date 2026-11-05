"use client";

import { useEditorState, type Editor } from "@tiptap/react";

type Item = {
  label: string;
  title: string;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
  enabled?: (e: Editor) => boolean;
  className?: string;
};

const groups: Item[][] = [
  [
    { label: "↶", title: "Undo (Ctrl+Z)", run: (e) => e.chain().focus().undo().run(), enabled: (e) => e.can().undo() },
    { label: "↷", title: "Redo (Ctrl+Shift+Z)", run: (e) => e.chain().focus().redo().run(), enabled: (e) => e.can().redo() },
  ],
  [
    { label: "B", title: "Bold (Ctrl+B)", className: "font-bold", run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
    { label: "I", title: "Italic (Ctrl+I)", className: "italic", run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
    { label: "U", title: "Underline (Ctrl+U)", className: "underline", run: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive("underline") },
  ],
  [
    { label: "¶", title: "Paragraph", run: (e) => e.chain().focus().setParagraph().run(), active: (e) => e.isActive("paragraph") },
    { label: "H1", title: "Heading 1", run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), active: (e) => e.isActive("heading", { level: 1 }) },
    { label: "H2", title: "Heading 2", run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
    { label: "H3", title: "Heading 3", run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive("heading", { level: 3 }) },
  ],
  [
    { label: "• List", title: "Bulleted list", run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
    { label: "1. List", title: "Numbered list", run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
  ],
];

const allItems = groups.flat();

export function Toolbar({ editor }: { editor: Editor }) {
  // Re-render only when an active/enabled flag actually changes.
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      allItems.map((it) => `${it.active?.(e) ? 1 : 0}${it.enabled ? (it.enabled(e) ? 1 : 0) : 1}`).join(""),
  });

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
    >
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5 border-slate-200 [&:not(:last-child)]:border-r [&:not(:last-child)]:pr-1">
          {group.map((it) => {
            const idx = allItems.indexOf(it);
            const active = state[idx * 2] === "1";
            const enabled = state[idx * 2 + 1] === "1";
            return (
              <button
                key={it.title}
                type="button"
                title={it.title}
                aria-label={it.title}
                aria-pressed={it.active ? active : undefined}
                disabled={!enabled}
                // Keep the editor selection when clicking a toolbar button.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => it.run(editor)}
                className={`min-w-8 rounded-md px-2 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  active ? "bg-indigo-100 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
                } ${it.className ?? ""}`}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
