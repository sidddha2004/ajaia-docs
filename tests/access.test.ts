import { describe, expect, it } from "vitest";
import { can, hasRole, resolveRole, type Role } from "@/lib/access";

const doc = { ownerId: 1 };
const shares = [
  { userId: 2, role: "editor" as const },
  { userId: 3, role: "viewer" as const },
];

describe("resolveRole", () => {
  it("gives the owner the owner role", () => {
    expect(resolveRole(1, doc, shares)).toBe("owner");
  });

  it("gives shared users their shared role", () => {
    expect(resolveRole(2, doc, shares)).toBe("editor");
    expect(resolveRole(3, doc, shares)).toBe("viewer");
  });

  it("gives a stranger no access", () => {
    expect(resolveRole(4, doc, shares)).toBeNull();
    expect(resolveRole(4, doc, [])).toBeNull();
  });

  it("prefers ownership even if a stray share row exists for the owner", () => {
    expect(resolveRole(1, doc, [{ userId: 1, role: "viewer" }])).toBe("owner");
  });
});

describe("hasRole ordering (owner > editor > viewer > none)", () => {
  const roles: (Role | null)[] = ["owner", "editor", "viewer", null];
  const mins: Role[] = ["owner", "editor", "viewer"];

  // [role][min] → allowed?
  const expected: Record<string, Record<Role, boolean>> = {
    owner: { owner: true, editor: true, viewer: true },
    editor: { owner: false, editor: true, viewer: true },
    viewer: { owner: false, editor: false, viewer: true },
    null: { owner: false, editor: false, viewer: false },
  };

  for (const role of roles) {
    for (const min of mins) {
      const allowed = expected[String(role)][min];
      it(`${role ?? "stranger"} ${allowed ? "meets" : "does not meet"} ${min}`, () => {
        expect(hasRole(role, min)).toBe(allowed);
      });
    }
  }
});

describe("can.* action helpers", () => {
  it("maps actions to minimum roles", () => {
    expect([can.read("viewer"), can.edit("viewer"), can.manage("viewer")]).toEqual([true, false, false]);
    expect([can.read("editor"), can.edit("editor"), can.manage("editor")]).toEqual([true, true, false]);
    expect([can.read("owner"), can.edit("owner"), can.manage("owner")]).toEqual([true, true, true]);
    expect([can.read(null), can.edit(null), can.manage(null)]).toEqual([false, false, false]);
  });
});
