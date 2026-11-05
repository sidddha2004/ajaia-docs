import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/session";

describe("session tokens", () => {
  it("round-trips a signed session", async () => {
    const token = await signSession({ uid: 42 });
    expect(await verifySession(token)).toEqual({ uid: 42 });
  });

  it("rejects a missing token", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("")).toBeNull();
  });

  it("rejects a token whose payload was changed", async () => {
    const [h, , s] = (await signSession({ uid: 1 })).split(".");
    const forged = Buffer.from(JSON.stringify({ uid: 2 })).toString("base64url");
    expect(await verifySession(`${h}.${forged}.${s}`)).toBeNull();
  });

  it("rejects an unsigned (alg: none) token", async () => {
    const h = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const p = Buffer.from(JSON.stringify({ uid: 1 })).toString("base64url");
    expect(await verifySession(`${h}.${p}.`)).toBeNull();
  });
});
