// Pure access rules: no DB, no framework, so they are trivially unit-testable.

export type Role = "owner" | "editor" | "viewer";

export const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };

export type DocLike = { ownerId: number };
export type ShareLike = { userId: number; role: "editor" | "viewer" };

/** The caller's effective role on a document, or null when they have no access. */
export function resolveRole(userId: number, doc: DocLike, shares: ShareLike[]): Role | null {
  if (doc.ownerId === userId) return "owner";
  const share = shares.find((s) => s.userId === userId);
  return share ? share.role : null;
}

export function hasRole(role: Role | null, min: Role): boolean {
  return role !== null && ROLE_RANK[role] >= ROLE_RANK[min];
}

export const can = {
  read: (role: Role | null) => hasRole(role, "viewer"),
  edit: (role: Role | null) => hasRole(role, "editor"),
  manage: (role: Role | null) => hasRole(role, "owner"), // share, unshare, delete
};
