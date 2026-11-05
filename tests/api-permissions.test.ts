/**
 * API-level permission tests. The real route handlers run against an
 * in-memory fake of the Drizzle query builder, so this exercises
 * requireDocAccess → getDocAccess → resolveRole end to end without Postgres.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const ALICE: User = { id: 1, name: "Alice", email: "alice@ajaia.dev", avatarColor: "#000" };
const BOB: User = { id: 2, name: "Bob", email: "bob@ajaia.dev", avatarColor: "#000" };
const CAROL: User = { id: 3, name: "Carol", email: "carol@ajaia.dev", avatarColor: "#000" };
const DOC_ID = "11111111-1111-4111-8111-111111111111";

// ---- fakes -----------------------------------------------------------------

const state = vi.hoisted(() => ({
  currentUser: null as unknown,
  docs: [] as Record<string, unknown>[],
  shares: [] as { documentId: string; userId: number; role: "editor" | "viewer" }[],
  users: [] as Record<string, unknown>[],
  writes: [] as string[],
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => state.currentUser }));

vi.mock("@/db", async () => {
  const schema = await import("@/db/schema");
  const rowsFor = (table: unknown) =>
    table === schema.documents ? state.docs : table === schema.documentShares ? state.shares : state.users;

  // A chainable, awaitable stand-in for drizzle's select/update/delete
  // builders. Filtering by `where` isn't modelled: each table holds only the
  // rows relevant to the test (one doc; shares for that doc), which is enough
  // because resolveRole itself picks the caller's share by userId.
  const query = (rows: () => unknown[]) => {
    const q: Record<string, unknown> = {};
    for (const m of ["where", "limit", "orderBy", "innerJoin", "set", "values", "onConflictDoUpdate"]) q[m] = () => q;
    q.returning = () => q;
    q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(rows()).then(res, rej);
    return q;
  };

  return {
    db: {
      select: () => ({ from: (t: unknown) => query(() => rowsFor(t)) }),
      update: (t: unknown) => {
        state.writes.push(`update:${t === schema.documents ? "documents" : "?"}`);
        return query(() => state.docs);
      },
      delete: (t: unknown) => {
        state.writes.push(`delete:${t === schema.documents ? "documents" : "document_shares"}`);
        return query(() => []);
      },
      insert: (t: unknown) => {
        state.writes.push(`insert:${t === schema.documentShares ? "document_shares" : "?"}`);
        return query(() => []);
      },
    },
  };
});

const docRoute = await import("@/app/api/documents/[id]/route");
const sharesRoute = await import("@/app/api/documents/[id]/shares/route");

// ---- helpers ---------------------------------------------------------------

const ctx = { params: Promise.resolve({ id: DOC_ID }) };
const json = (method: string, body: unknown) =>
  new Request(`http://test/api/documents/${DOC_ID}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const as = (u: User | null) => (state.currentUser = u);
const shareWith = (u: User, role: "editor" | "viewer") => state.shares.push({ documentId: DOC_ID, userId: u.id, role });

beforeEach(() => {
  state.docs = [
    { id: DOC_ID, ownerId: ALICE.id, title: "Plan", content: { type: "doc" }, createdAt: new Date(), updatedAt: new Date() },
  ];
  state.shares = [];
  state.users = [ALICE, BOB, CAROL];
  state.writes = [];
  as(null);
});

// ---- tests -----------------------------------------------------------------

describe("GET /api/documents/:id", () => {
  it("401 when signed out", async () => {
    expect((await docRoute.GET(new Request("http://test"), ctx)).status).toBe(401);
  });

  it("404 for a stranger, so the document's existence isn't revealed", async () => {
    as(CAROL);
    const res = await docRoute.GET(new Request("http://test"), ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Document not found" });
  });

  it("404 for a malformed id", async () => {
    as(ALICE);
    const res = await docRoute.GET(new Request("http://test"), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });

  it("200 for the owner and for a viewer, with their role", async () => {
    as(ALICE);
    expect(await (await docRoute.GET(new Request("http://test"), ctx)).json()).toMatchObject({ role: "owner" });
    shareWith(BOB, "viewer");
    as(BOB);
    const res = await docRoute.GET(new Request("http://test"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ role: "viewer" });
  });
});

describe("PATCH /api/documents/:id", () => {
  it("403 for a viewer and nothing is written", async () => {
    shareWith(BOB, "viewer");
    as(BOB);
    const res = await docRoute.PATCH(json("PATCH", { title: "hacked" }), ctx);
    expect(res.status).toBe(403);
    expect(state.writes).toEqual([]);
  });

  it("404 for a stranger", async () => {
    as(CAROL);
    expect((await docRoute.PATCH(json("PATCH", { title: "x" }), ctx)).status).toBe(404);
    expect(state.writes).toEqual([]);
  });

  it("200 for an editor", async () => {
    shareWith(BOB, "editor");
    as(BOB);
    const res = await docRoute.PATCH(json("PATCH", { title: "Renamed" }), ctx);
    expect(res.status).toBe(200);
    expect(state.writes).toEqual(["update:documents"]);
  });

  it("400 for invalid input, even from the owner", async () => {
    as(ALICE);
    for (const body of [{}, { title: "  " }, { content: { type: "paragraph" } }, { ownerId: 3 }]) {
      expect((await docRoute.PATCH(json("PATCH", body), ctx)).status).toBe(400);
    }
    expect(state.writes).toEqual([]);
  });
});

describe("owner-only actions", () => {
  it("DELETE: 403 for an editor, 204 for the owner", async () => {
    shareWith(BOB, "editor");
    as(BOB);
    expect((await docRoute.DELETE(new Request("http://test"), ctx)).status).toBe(403);
    expect(state.writes).toEqual([]);
    as(ALICE);
    expect((await docRoute.DELETE(new Request("http://test"), ctx)).status).toBe(204);
    expect(state.writes).toEqual(["delete:documents"]);
  });

  it("sharing: 403 for an editor, 404 for a stranger", async () => {
    shareWith(BOB, "editor");
    const body = { email: "carol@ajaia.dev", role: "editor" };
    as(BOB);
    expect((await sharesRoute.POST(json("POST", body), ctx)).status).toBe(403);
    as(CAROL);
    expect((await sharesRoute.POST(json("POST", body), ctx)).status).toBe(404);
    expect(state.writes).toEqual([]);
  });
});
