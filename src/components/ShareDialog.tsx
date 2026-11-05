"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ShareEntry } from "@/lib/shares";
import { Avatar } from "./Avatar";
import { useToast } from "./Toaster";

type Person = { name: string; email: string; avatarColor: string };
type ShareRole = ShareEntry["role"];

type Props = {
  docId: string;
  owner: Person;
  initialShares: ShareEntry[];
  /** Email suggestions. Fine for a 3-user demo; a real app would search server-side. */
  suggestions: string[];
};

export function ShareButton(props: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(props.initialShares.length);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
      >
        Share
        {count > 0 && <span className="rounded-full bg-indigo-500 px-1.5 text-xs">{count}</span>}
      </button>
      {open && <ShareDialog {...props} onClose={() => setOpen(false)} onCountChange={setCount} />}
    </>
  );
}

function ShareDialog({
  docId,
  owner,
  initialShares,
  suggestions,
  onClose,
  onCountChange,
}: Props & { onClose: () => void; onCountChange: (n: number) => void }) {
  const toast = useToast();
  const titleId = useId();
  const listId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [shares, setShares] = useState(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    emailRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function apply(next: ShareEntry[]) {
    setShares(next);
    onCountChange(next.length);
  }

  async function call(url: string, init: RequestInit): Promise<ShareEntry[]> {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.error ?? "Something went wrong");
    return body.shares;
  }

  async function share(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const target = email.trim().toLowerCase();
      const existed = shares.some((s) => s.email === target);
      apply(await call(`/api/documents/${docId}/shares`, { method: "POST", body: JSON.stringify({ email: target, role }) }));
      toast(existed ? `Updated ${target} to ${role}` : `Shared with ${target}`, "success");
      setEmail("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't share");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(s: ShareEntry, next: ShareRole) {
    const prev = shares;
    apply(shares.map((x) => (x.userId === s.userId ? { ...x, role: next } : x))); // optimistic
    try {
      apply(await call(`/api/documents/${docId}/shares`, { method: "POST", body: JSON.stringify({ email: s.email, role: next }) }));
    } catch (err) {
      apply(prev);
      toast(err instanceof Error ? err.message : "Couldn't change role");
    }
  }

  async function remove(s: ShareEntry) {
    const prev = shares;
    apply(shares.filter((x) => x.userId !== s.userId)); // optimistic
    try {
      apply(await call(`/api/documents/${docId}/shares/${s.userId}`, { method: "DELETE" }));
      toast(`Removed ${s.name}`, "success");
    } catch (err) {
      apply(prev);
      toast(err instanceof Error ? err.message : "Couldn't remove access");
    }
  }

  const available = suggestions.filter((e) => !shares.some((s) => s.email === e));

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            Share document
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ✕
          </button>
        </div>

        <form onSubmit={share} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`${listId}-email`}>
            Email
          </label>
          <input
            id={`${listId}-email`}
            ref={emailRef}
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFormError(null);
            }}
            list={listId}
            placeholder="Add people by email"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <datalist id={listId}>
            {available.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
          <RoleSelect value={role} onChange={setRole} label="Role for new person" />
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? "Sharing…" : "Share"}
          </button>
        </form>
        {formError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {formError}
          </p>
        )}
        {available.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">Demo users: {available.join(", ")}</p>
        )}

        <h3 className="mt-6 text-sm font-medium text-slate-700">People with access</h3>
        <ul className="mt-2 divide-y divide-slate-100">
          <PersonRow person={owner}>
            <span className="text-sm text-slate-500">Owner</span>
          </PersonRow>
          {shares.map((s) => (
            <PersonRow key={s.userId} person={s}>
              <RoleSelect value={s.role} onChange={(r) => changeRole(s, r)} label={`Role for ${s.name}`} />
              <button
                type="button"
                onClick={() => remove(s)}
                aria-label={`Remove ${s.name}`}
                className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                Remove
              </button>
            </PersonRow>
          ))}
        </ul>
        {shares.length === 0 && <p className="mt-2 text-sm text-slate-500">Only you can open this document.</p>}
      </div>
    </div>
  );
}

function PersonRow({ person, children }: { person: Person; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar name={person.name} color={person.avatarColor} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">{person.name}</span>
        <span className="block truncate text-xs text-slate-500">{person.email}</span>
      </span>
      <span className="flex items-center gap-1">{children}</span>
    </li>
  );
}

function RoleSelect({ value, onChange, label }: { value: ShareRole; onChange: (r: ShareRole) => void; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as ShareRole)}
      className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-indigo-500"
    >
      <option value="viewer">Viewer</option>
      <option value="editor">Editor</option>
    </select>
  );
}
