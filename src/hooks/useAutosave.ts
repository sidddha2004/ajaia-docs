"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type Patch = Record<string, unknown>;

type Options = {
  /** Sends the merged patch. Should throw on failure. */
  save: (patch: Patch, opts: { keepalive?: boolean }) => Promise<void>;
  delay?: number;
};

/**
 * Debounced autosave. Edits are merged into one pending patch; only one request
 * is in flight at a time, and edits made during a save are sent right after.
 * On failure the patch is kept so `retry()` (or the next edit) resends it.
 */
export function useAutosave({ save, delay = 800 }: Options) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const pending = useRef<Patch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current || !pending.current) return;

    const patch = pending.current;
    pending.current = null;
    inFlight.current = true;
    setStatus("saving");
    try {
      await saveRef.current(patch, {});
      setError(null);
      setStatus(pending.current ? "pending" : "saved");
    } catch (e) {
      // Put the failed patch back underneath anything newer.
      pending.current = { ...patch, ...(pending.current ?? {}) };
      setError(e instanceof Error ? e.message : "Couldn't save");
      setStatus("error");
      return;
    } finally {
      inFlight.current = false;
    }
    if (pending.current) void flush();
  }, []);

  const schedule = useCallback(
    (patch: Patch) => {
      pending.current = { ...(pending.current ?? {}), ...patch };
      setStatus((s) => (s === "saving" ? s : "pending"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  // Leaving the page: warn while a save is outstanding, and try a last
  // keepalive request so a quick close after typing doesn't lose the edit.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current || inFlight.current) e.preventDefault();
    };
    const onPageHide = () => {
      if (pending.current && !inFlight.current) {
        void saveRef.current(pending.current, { keepalive: true }).catch(() => {});
        pending.current = null;
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      onPageHide(); // client-side navigation away from the editor
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { status, error, schedule, retry: flush };
}
