import "server-only";
import type { User } from "@/db/schema";
import type { Document } from "@/db/schema";
import type { Role } from "./access";
import { getCurrentUser } from "./auth";
import { getDocAccess } from "./documents";
import { jsonError } from "./http";

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; response: Response };

export async function requireUser(): Promise<Ok<{ user: User }> | Fail> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: jsonError(401, "Not signed in") };
  return { ok: true, user };
}

/** Every document route goes through this. */
export async function requireDocAccess(
  docId: string,
  minRole: Role,
): Promise<Ok<{ user: User; doc: Document; role: Role }> | Fail> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const access = await getDocAccess(auth.user, docId, minRole);
  if (!access.ok) {
    return {
      ok: false,
      response:
        access.status === 404
          ? jsonError(404, "Document not found")
          : jsonError(403, "You don't have permission to do that"),
    };
  }
  return { ok: true, user: auth.user, doc: access.doc, role: access.role };
}
