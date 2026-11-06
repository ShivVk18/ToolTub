import { describe, expect, it } from "vitest";
import { decodeJwt, expiryStatus } from "@/lib/engines/jwt";

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const make = (payload: object, header: object = { alg: "HS256", typ: "JWT" }, sig = "c2ln") =>
  `${b64url(header)}.${b64url(payload)}.${sig}`;

describe("decodeJwt", () => {
  it("decodes header and payload", () => {
    const d = decodeJwt(make({ sub: "u1", exp: 2000000000 }));
    expect(d.header.alg).toBe("HS256");
    expect(d.payload.sub).toBe("u1");
    expect(d.signed).toBe(true);
  });
  it("accepts a Bearer prefix and whitespace", () => {
    expect(decodeJwt(`  Bearer ${make({ a: 1 })}\n`).payload.a).toBe(1);
  });
  it("decodes UTF-8 payloads (Hindi, emoji)", () => {
    expect(decodeJwt(make({ name: "अनु 🚀" })).payload.name).toBe("अनु 🚀");
  });
  it("flags unsigned (alg none) tokens", () => {
    expect(decodeJwt(make({ a: 1 }, { alg: "none" }, "")).signed).toBe(false);
  });
  it.each([
    ["two parts", "abc.def"],
    ["four parts", "a.b.c.d"],
    ["not base64 JSON", "aaa.bbb.ccc"],
    ["payload is a string", `${b64url({ alg: "x" })}.${b64url("hi")}.s`],
    ["empty", ""],
  ])("rejects malformed tokens: %s", (_, t) => {
    expect(() => decodeJwt(t)).toThrow();
  });
});

describe("expiryStatus", () => {
  it("detects expired, valid and missing exp", () => {
    expect(expiryStatus({ exp: 100 }, 200)).toBe("expired");
    expect(expiryStatus({ exp: 300 }, 200)).toBe("valid");
    expect(expiryStatus({}, 200)).toBe("none");
  });
});
