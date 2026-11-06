/** [Own] JWT decoding. Decode only: never verifies, stores or sends the token. */
export const JWT_CLAIMS: Record<string, string> = {
  iss: "Issuer — who created the token",
  sub: "Subject — usually the user ID",
  aud: "Audience — who the token is for",
  exp: "Expires at",
  nbf: "Not valid before",
  iat: "Issued at",
  jti: "Token ID — unique identifier",
};
export const JWT_TIME_CLAIMS = ["exp", "nbf", "iat"];

/** Base64URL → UTF-8 string. */
export const base64UrlDecode = (s: string) => {
  const b64 = s
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signed: boolean;
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token
    .trim()
    .replace(/^Bearer\s+/i, "")
    .split(".");
  if (parts.length !== 3) throw new Error("A JWT has three parts separated by dots (header.payload.signature).");
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (typeof header !== "object" || header === null || typeof payload !== "object" || payload === null)
      throw new Error();
    return { header, payload, signed: parts[2].length > 0 };
  } catch {
    throw new Error("The header or payload isn't valid Base64URL-encoded JSON.");
  }
}

/** "expired" | "valid" | "none" relative to `nowSec`. */
export const expiryStatus = (payload: Record<string, unknown>, nowSec: number) => {
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp)) return "none" as const;
  return exp < nowSec ? ("expired" as const) : ("valid" as const);
};
