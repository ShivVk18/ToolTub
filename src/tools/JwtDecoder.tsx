"use client";
import { useMemo, useState } from "react";
import { ResultActions } from "@/components/workspace/ToolChrome";
import { ToolWorkspace } from "@/components/workspace/ToolWorkspace";
import type { ToolProps } from "./types";
import { JWT_CLAIMS as CLAIMS, JWT_TIME_CLAIMS as TIME_CLAIMS, decodeJwt as decode, expiryStatus } from "@/lib/jwt";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGgua2xpcGtpdC5jb20iLCJzdWIiOiJ1c2VyXzEyMyIsImF1ZCI6ImFwaSIsImlhdCI6MTc2MjAwMDAwMCwiZXhwIjoxNzYyMDAzNjAwLCJyb2xlIjoiZWRpdG9yIn0.c2lnbmF0dXJl";

/** [Own] JWT Decoder. Decodes only: it never verifies, stores or sends the token. */
export function JwtDecoder({ slug, next }: ToolProps) {
  const [token, setToken] = useState("");
  const decoded = useMemo(() => {
    if (!token.trim()) return null;
    try {
      return { ok: true as const, ...decode(token) };
    } catch (e) {
      return { ok: false as const, message: (e as Error).message };
    }
  }, [token]);

  // eslint-disable-next-line react-hooks/purity -- comparing against "now" is the point of the badge
  const status = decoded?.ok ? expiryStatus(decoded.payload, Date.now() / 1000) : "none";

  return (
    <ToolWorkspace
      status={decoded && !decoded.ok ? "error" : "idle"}
      error={decoded && !decoded.ok ? { cause: decoded.message, fix: "Paste the whole token, with or without the “Bearer ” prefix." } : null}
      input={
        <div className="space-y-2">
          <textarea value={token} onChange={(e) => setToken(e.target.value)} spellCheck={false} aria-label="JWT" placeholder="Paste a JSON Web Token (eyJ…)" className="h-28 w-full resize-y break-all rounded-lg border border-border bg-bg p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <button className="inline-flex min-h-11 items-center text-xs text-fg-muted underline sm:min-h-0" onClick={() => setToken(SAMPLE)}>
            Try a sample
          </button>
        </div>
      }
      result={
        decoded?.ok && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-2.5 py-1">alg: {String(decoded.header.alg)}</span>
              {status !== "none" &&
                (status === "expired" ? (
                  <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-600 dark:text-red-400">Expired</span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">Not expired</span>
                ))}
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400">Signature not verified (decode only)</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-1 text-sm font-medium">Header</h3>
                <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-sm">{JSON.stringify(decoded.header, null, 2)}</pre>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium">Payload</h3>
                <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-sm">{JSON.stringify(decoded.payload, null, 2)}</pre>
              </div>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(decoded.payload)
                  .filter(([k]) => CLAIMS[k])
                  .map(([k, v]) => (
                    <tr key={k} className="border-t border-border">
                      <td className="py-2 pr-4 font-mono">{k}</td>
                      <td className="py-2 pr-4 text-fg-muted">{CLAIMS[k]}</td>
                      <td className="py-2">{TIME_CLAIMS.includes(k) ? new Date(Number(v) * 1000).toLocaleString() : String(v)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <ResultActions items={[{ name: "payload.json", type: "application/json", text: JSON.stringify(decoded.payload, null, 2) }]} next={next} from={slug} />
          </div>
        )
      }
    />
  );
}
