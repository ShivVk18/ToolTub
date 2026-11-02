import type { ToolSEO } from "../types";
import { loc } from "./shared";

export const jwtDecoder: ToolSEO = {
  primaryKeyword: "jwt decoder",
  secondaryKeywords: ["decode jwt", "jwt parser", "jwt debugger", "jwt token decode online", "is it safe to decode jwt online"],
  searchIntent: "do",
  title: "JWT Decoder – Decode JSON Web Tokens Locally | KlipKit",
  description: "Decode JWT header and payload in your browser. See expiry, issued-at and every claim explained. Your token never leaves your device. Free, no sign-up.",
  ogTitle: "JWT Decoder — decode tokens without sending them anywhere",
  ogDescription: "Header, payload, expiry and claims explained. Runs locally in your browser.",
  ogAlt: "KlipKit JWT Decoder showing a token's header, payload and an Expired badge",
  h1: "JWT Decoder",
  answerQuestion: "How do I decode a JWT safely?",
  answerSummary:
    "Paste the token into KlipKit's JWT Decoder and the header and payload appear instantly, with expiry and issued-at times converted to your local time and each standard claim explained. Decoding happens in your browser, so the token is never sent to a server or logged. It is free and needs no account.",
  keyFacts: [
    "Decodes the header and payload of any JSON Web Token (JWT)",
    "Shows exp, iat and nbf as local dates with an Expired or Valid badge",
    "Explains standard claims: iss, sub, aud, exp, nbf, iat, jti",
    "Processing: entirely in your browser; the token is never uploaded or stored",
    "Decoding does not verify the signature (see FAQ)",
    "Cost: free, no account",
  ],
  howToSteps: [
    { name: "Paste the token", text: "Paste the JWT, with or without the Bearer prefix." },
    { name: "Read header and payload", text: "Review the decoded JSON, the algorithm and the expiry badge." },
    { name: "Copy what you need", text: "Copy the payload or send it to the JSON Formatter." },
  ],
  totalTime: "PT10S",
  faqs: [
    {
      q: "Is it safe to decode a JWT online?",
      a: "Only with a decoder that runs in your browser. A JWT is a credential: anyone who has a valid one can act as the user until it expires. KlipKit decodes tokens locally and never sends them anywhere. Even so, prefer test or expired tokens and never paste production tokens into tools that upload them.",
    },
    {
      q: "Does decoding a JWT verify it?",
      a: "No. Decoding only reads the Base64URL-encoded header and payload, which anyone can do. Verification checks the signature with the secret or public key, proving the token was issued by a trusted server and not changed. Always verify tokens on your server before trusting their claims.",
    },
    {
      q: "What is a JSON Web Token (JWT)?",
      a: "A JSON Web Token (JWT) is a compact, URL-safe string used to pass identity and permission claims between systems. It has three parts separated by dots: a header describing the algorithm, a payload of claims, and a signature. Payloads are encoded, not encrypted, so they are readable.",
    },
    {
      q: "Why does my JWT show as expired?",
      a: "The exp claim is a Unix timestamp in seconds, and it is earlier than your device's current time. Most access tokens expire after 5 to 60 minutes by design. If a fresh token appears expired, check that your computer's clock is correct and that the server sets exp in seconds, not milliseconds.",
    },
    {
      q: "Can someone read the data inside my JWT?",
      a: "Yes. The header and payload are only Base64URL-encoded, so anyone with the token can read them. Never put passwords, card numbers or other secrets in a JWT payload. If the contents must stay hidden, use an encrypted token format such as JWE instead of a signed JWT.",
    },
    {
      q: "What do iss, sub, aud and iat mean?",
      a: "They are registered claims. iss is the issuer that created the token, sub is the subject, usually a user ID, and aud is the intended audience, such as your API. iat is when the token was issued, exp when it expires, and nbf the time before which it must not be accepted.",
    },
  ],
  comparisonTable: {
    caption: "Decode vs verify vs encrypt",
    headers: ["Action", "Needs a key?", "What it proves", "Where to do it"],
    rows: [
      ["Decode", "No", "Nothing; only reads the contents", "Anywhere, e.g. KlipKit"],
      ["Verify signature", "Yes (secret or public key)", "Token is authentic and unchanged", "Your server"],
      ["Encrypt (JWE)", "Yes", "Contents are hidden", "Your server"],
    ],
  },
  explainer:
    "A JSON Web Token (JWT) is defined in RFC 7519. It looks like xxxxx.yyyyy.zzzzz: a Base64URL-encoded header, a Base64URL-encoded payload and a signature. Servers issue JWTs after login, and clients send them in the Authorization header to prove who they are.\n\nDecode a JWT when debugging authentication: checking whether a token has expired, which audience it was issued for, or which roles and scopes it carries.\n\nCommon mistakes: treating a decoded payload as trusted without verifying the signature; storing sensitive data in the payload because it looks scrambled; mixing up seconds and milliseconds in exp; and pasting live production tokens into decoders that send them to a server, where they could be logged and reused until they expire.",
  featureList: ["Decode JWT header and payload", "Expiry badge with local time", "Claims explained", "Processed in your browser", "No sign-up"],
  llmsLine: "JWT Decoder: decode JSON Web Token header and payload locally in the browser, with expiry check and claims explained.",
  relatedGuides: ["what-is-a-jwt-and-is-it-safe-to-decode-online", "jwt-vs-session-cookies"],
  locales: loc("jwt-decoder"),
  lastReviewed: "2026-11-02",
  reviewedBy: "founder",
};
