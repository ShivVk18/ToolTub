"use client";
/** Diff Checker, API Tester, HTML Playground, Text to Speech and Résumé Builder. All in the browser. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/tool/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/tool/ToolWorkspace";
import { diffLines, unified, type DiffLine } from "@/lib/engines/diff";
import { formatBytes } from "@/lib/utils";
import { pdfWorker } from "@/workers/clients";
import type { Resume } from "@/workers/pdf-ops";
import type { ToolProps } from "./types";

const area =
  "w-full rounded-2xl border border-line bg-solid p-3 font-mono text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent";
function Done({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div
      data-testid="result-row"
      className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line bg-soft p-4"
    >
      <p className="text-lg font-semibold text-ink">{text}</p>
      {children}
    </div>
  );
}
/** localStorage that never throws (private mode, blocked storage). */
const store = {
  get: <T,>(k: string, d: T): T => {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : d;
    } catch {
      return d;
    }
  },
  set: (k: string, v: unknown) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage blocked: keep working without saving */
    }
  },
};

// ───────────────────────── Diff checker ─────────────────────────
const SAMPLE_A = "KlipKit has 26 tools.\nEverything runs on your device.\nNothing is uploaded.";
const SAMPLE_B = "KlipKit has 72 tools.\nEverything runs on your device.\nNothing is ever uploaded.\nIt's free.";

export function DiffChecker({ slug }: ToolProps) {
  const [a, setA] = useState(SAMPLE_A);
  const [b, setB] = useState(SAMPLE_B);
  const [ws, setWs] = useState(false);
  const [ci, setCi] = useState(false);
  const [view, setView] = useState<"split" | "unified">("split");
  const [deferred, setDeferred] = useState({ a, b });
  useEffect(() => {
    const t = setTimeout(() => setDeferred({ a, b }), a.length + b.length > 200_000 ? 400 : 80);
    return () => clearTimeout(t);
  }, [a, b]);
  const d = useMemo(
    () => diffLines(deferred.a, deferred.b, { ignoreWhitespace: ws, ignoreCase: ci }),
    [deferred, ws, ci],
  );
  const patch = useMemo(
    () => unified(deferred.a, deferred.b, { ignoreWhitespace: ws, ignoreCase: ci }),
    [deferred, ws, ci],
  );
  const same = d.added + d.removed + d.changed === 0;
  const cell = (l: DiffLine, side: "left" | "right") => {
    const text = side === "left" ? l.left : l.right;
    if (text === undefined) return <td className="bg-soft" />;
    const cls = l.type === "eq" ? "" : side === "left" ? "bg-[rgba(229,72,77,.12)]" : "bg-[rgba(31,157,99,.12)]";
    return (
      <td className={`whitespace-pre-wrap break-all px-2 align-top ${cls}`}>
        {l.type === "mod"
          ? l
              .words!.filter((w) => w.type === "eq" || w.type === (side === "left" ? "del" : "ins"))
              .map((w, i) => (
                <span
                  key={i}
                  className={
                    w.type === "eq"
                      ? ""
                      : side === "left"
                        ? "rounded bg-[rgba(229,72,77,.35)]"
                        : "rounded bg-[rgba(31,157,99,.35)]"
                  }
                >
                  {w.text}
                </span>
              ))
          : text}
      </td>
    );
  };
  return (
    <ToolWorkspace
      status="idle"
      input={
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-fg-muted">
            Original
            <textarea
              value={a}
              onChange={(e) => setA(e.target.value)}
              rows={10}
              className={`${area} mt-1`}
              spellCheck={false}
            />
          </label>
          <label className="text-sm text-fg-muted">
            Changed
            <textarea
              value={b}
              onChange={(e) => setB(e.target.value)}
              rows={10}
              className={`${area} mt-1`}
              spellCheck={false}
            />
          </label>
        </div>
      }
      settings={
        <>
          <Field label="View">
            <select value={view} onChange={(e) => setView(e.target.value as typeof view)} className={inputClass}>
              <option value="split">Side by side</option>
              <option value="unified">Unified (patch)</option>
            </select>
          </Field>
          <label className="flex h-11 items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="size-4" checked={ws} onChange={(e) => setWs(e.target.checked)} /> Ignore
            whitespace
          </label>
          <label className="flex h-11 items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="size-4" checked={ci} onChange={(e) => setCi(e.target.checked)} /> Ignore
            case
          </label>
        </>
      }
      result={
        <div className="space-y-3">
          <p data-testid="diff-stats" className="text-sm text-ink2">
            {same ? "No differences." : `${d.changed} changed · ${d.added} added · ${d.removed} removed`}
          </p>
          {!same &&
            (view === "split" ? (
              <div className="max-h-[480px] overflow-auto rounded-2xl border border-line">
                <table data-testid="diff-table" className="w-full table-fixed border-collapse font-mono text-xs">
                  <tbody>
                    {d.lines.map((l, i) => (
                      <tr key={i} data-type={l.type} className="border-b border-line">
                        <td className="w-10 select-none px-1 text-right text-ink2">{l.a ?? ""}</td>
                        {cell(l, "left")}
                        <td className="w-10 select-none px-1 text-right text-ink2">{l.b ?? ""}</td>
                        {cell(l, "right")}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre
                data-testid="diff-unified"
                className="max-h-[480px] overflow-auto rounded-2xl border border-line bg-soft p-3 text-xs"
              >
                {patch}
              </pre>
            ))}
          {!same && <ResultActions items={[{ name: "changes.diff", type: "text/x-diff", text: patch }]} from={slug} />}
        </div>
      }
    />
  );
}

// ───────────────────────── API tester ─────────────────────────
type ApiResult = {
  status: number;
  statusText: string;
  ms: number;
  size: number;
  headers: [string, string][];
  body: string;
  json: boolean;
};

export function ApiTester({ slug }: ToolProps) {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState("Accept: application/json");
  const [body, setBody] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => setHistory(store.get("kk-api-history", [])), []);
  const job = useToolRun<ApiResult>();
  const send = () =>
    job.run(
      async () => {
        let u: URL;
        try {
          u = new URL(url.trim());
        } catch {
          throw new Error("That isn't a full URL. Start with https://");
        }
        if (!/^https?:$/.test(u.protocol)) throw new Error("Only http:// and https:// URLs can be called.");
        const h = new Headers();
        for (const line of headers.split("\n")) {
          const m = /^\s*([^:\s]+)\s*:\s*(.*)$/.exec(line);
          if (m) h.set(m[1], m[2]);
          else if (line.trim()) throw new Error(`Header lines look like "Name: value" ("${line.trim()}" doesn't).`);
        }
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 30_000);
        const t0 = performance.now();
        let res: Response;
        try {
          res = await fetch(u, {
            method,
            headers: h,
            body: method === "GET" || method === "HEAD" ? undefined : body,
            signal: ctl.signal,
            credentials: "omit",
            referrerPolicy: "no-referrer",
          });
        } catch (e) {
          throw new Error(
            (e as Error).name === "AbortError"
              ? "No answer after 30 seconds."
              : "The request was blocked or the server didn't answer. Browsers only allow APIs that permit cross-origin calls (CORS).",
          );
        } finally {
          clearTimeout(t);
        }
        const text = await res.text();
        const ms = Math.round(performance.now() - t0);
        let pretty = text;
        let json = false;
        try {
          pretty = JSON.stringify(JSON.parse(text), null, 2);
          json = true;
        } catch {
          /* not JSON */
        }
        const next = [`${method} ${u.href}`, ...history.filter((x) => x !== `${method} ${u.href}`)].slice(0, 10);
        setHistory(next);
        store.set("kk-api-history", next);
        return {
          status: res.status,
          statusText: res.statusText,
          ms,
          size: new Blob([text]).size,
          headers: [...res.headers.entries()],
          body: pretty,
          json,
        };
      },
      (e) => ({ cause: e.message }),
    );
  const curl = `curl -X ${method} ${JSON.stringify(url.trim())}${headers
    .split("\n")
    .filter((l) => l.includes(":"))
    .map((l) => ` \\\n  -H ${JSON.stringify(l.trim())}`)
    .join("")}${body && method !== "GET" && method !== "HEAD" ? ` \\\n  --data ${JSON.stringify(body)}` : ""}`;
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      input={
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={inputClass}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <input
              aria-label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={`${inputClass} min-w-0 flex-1`}
              placeholder="https://api.example.com/items"
              list="api-history"
            />
            <datalist id="api-history">
              {history.map((h) => (
                <option key={h} value={h.split(" ")[1]} />
              ))}
            </datalist>
          </div>
          <label className="block text-sm text-fg-muted">
            Headers (one per line)
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              rows={3}
              className={`${area} mt-1`}
              spellCheck={false}
            />
          </label>
          {method !== "GET" && method !== "HEAD" && (
            <label className="block text-sm text-fg-muted">
              Body
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className={`${area} mt-1`}
                spellCheck={false}
                placeholder='{"name": "KlipKit"}'
              />
            </label>
          )}
          <p className="text-xs text-ink2">
            Sent straight from your browser, never through KlipKit. Cookies aren&apos;t sent. Only APIs that allow
            cross-origin requests (CORS) can be called.
          </p>
        </div>
      }
      action={{ label: "Send", onClick: send, disabled: !url.trim() }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <Done
              text={`${job.result.status} ${job.result.statusText} · ${job.result.ms} ms · ${formatBytes(job.result.size)}`}
            >
              <ResultActions
                items={[{ name: "response.txt", type: "text/plain", text: job.result.body }]}
                from={slug}
              />
            </Done>
            <details className="rounded-2xl border border-line p-3 text-sm">
              <summary className="cursor-pointer">Headers ({job.result.headers.length})</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {job.result.headers.map(([k, v]) => `${k}: ${v}`).join("\n")}
              </pre>
            </details>
            <pre
              data-testid="api-body"
              className="max-h-96 overflow-auto rounded-2xl border border-line bg-soft p-3 text-xs"
            >
              {job.result.body}
            </pre>
            <details className="rounded-2xl border border-line p-3 text-sm">
              <summary className="cursor-pointer">As cURL</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">{curl}</pre>
            </details>
          </div>
        )
      }
    />
  );
}

// ───────────────────────── HTML playground ─────────────────────────
const PG_HTML = '<h1>Hello, KlipKit</h1>\n<button id="b">Click me</button>';
const PG_CSS = "body { font-family: system-ui; padding: 24px }\nh1 { color: #6d5df5 }";
const PG_JS = 'document.getElementById("b").onclick = () => console.log("clicked", new Date().toISOString());';

/** The preview runs in a sandboxed iframe without same-origin access; console calls are posted back to us. */
function srcdoc(html: string, css: string, js: string) {
  const bridge = `<script>(function(){var send=function(t,a){try{parent.postMessage({kk:"pg",type:t,args:[].map.call(a,function(x){try{return typeof x==="string"?x:JSON.stringify(x)}catch(e){return String(x)}})},"*")}catch(e){}};["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){send(k,arguments);o.apply(console,arguments)}});window.onerror=function(m,s,l){send("error",[/^Script error\.?$/.test(m)?"Script error (details hidden by this browser; see its console)":m+" (line "+l+")"])}})();<\/script>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style>${bridge}</head><body>${html}<script>${js.replace(/<\/script/gi, "<\\/script")}<\/script></body></html>`;
}

export function HtmlPlayground({ slug }: ToolProps) {
  const saved = useMemo(() => store.get("kk-playground", { html: PG_HTML, css: PG_CSS, js: PG_JS }), []);
  const [html, setHtml] = useState(saved.html);
  const [css, setCss] = useState(saved.css);
  const [js, setJs] = useState(saved.js);
  const [doc, setDoc] = useState(() => srcdoc(saved.html, saved.css, saved.js));
  const [logs, setLogs] = useState<{ type: string; text: string }[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      // only reload (and clear the console) when the code really changed: the first run after mount used to wipe
      // logs from clicks made in the first half-second
      const next = srcdoc(html, css, js);
      setDoc((cur) => {
        if (cur !== next) setLogs([]);
        return next;
      });
      store.set("kk-playground", { html, css, js });
    }, 500);
    return () => clearTimeout(t);
  }, [html, css, js]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.data?.kk !== "pg") return;
      setLogs((l) => [...l.slice(-99), { type: e.data.type, text: (e.data.args as string[]).join(" ") }]);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  const ed = (label: string, v: string, set: (s: string) => void) => (
    <label className="block text-sm text-fg-muted">
      {label}
      <textarea
        value={v}
        onChange={(e) => set(e.target.value)}
        rows={6}
        spellCheck={false}
        className={`${area} mt-1`}
      />
    </label>
  );
  const page = srcdoc(html, css, js).replace(/<script>\(function\(\)\{var send[\s\S]*?<\/script>/, "");
  return (
    <ToolWorkspace
      status="idle"
      input={
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            {ed("HTML", html, setHtml)}
            {ed("CSS", css, setCss)}
            {ed("JavaScript", js, setJs)}
          </div>
          <div className="space-y-2">
            <iframe
              ref={frame}
              title="Preview"
              data-testid="pg-preview"
              sandbox="allow-scripts allow-modals"
              srcDoc={doc}
              className="h-80 w-full rounded-2xl border border-line bg-white"
            />
            <div
              data-testid="pg-console"
              className="h-32 overflow-auto rounded-2xl border border-line bg-soft p-2 font-mono text-xs"
              aria-label="Console"
              aria-live="polite"
            >
              {logs.length ? (
                logs.map((l, i) => (
                  <div key={i} className={l.type === "error" ? "text-[var(--g-p)]" : "text-ink"}>{`› ${l.text}`}</div>
                ))
              ) : (
                <span className="text-ink2">Console output appears here</span>
              )}
            </div>
          </div>
        </div>
      }
      result={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-11 rounded-full border border-line px-4 text-sm"
            onClick={() => (setHtml(PG_HTML), setCss(PG_CSS), setJs(PG_JS))}
          >
            Reset to example
          </button>
          <ResultActions
            items={[{ name: "playground.html", type: "text/html", blob: new Blob([page], { type: "text/html" }) }]}
            from={slug}
          />
        </div>
      }
    />
  );
}

// ───────────────────────── Text to speech ─────────────────────────
export function TextToSpeech() {
  const [text, setText] = useState("KlipKit reads your text out loud, right in the browser. Nothing is sent anywhere.");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [state, setState] = useState<"idle" | "speaking" | "paused">("idle");
  const [at, setAt] = useState<[number, number] | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return setSupported(false);
    setSupported(true);
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      speechSynthesis.cancel();
    };
  }, []);
  const speak = () => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find((x) => x.voiceURI === voice);
    if (v) u.voice = v;
    u.rate = rate;
    u.pitch = pitch;
    u.onboundary = (e) => {
      const len = e.charLength || (/^\S+/.exec(text.slice(e.charIndex))?.[0].length ?? 0);
      setAt([e.charIndex, e.charIndex + len]);
    };
    u.onend = u.onerror = () => (setState("idle"), setAt(null));
    speechSynthesis.speak(u);
    setState("speaking");
  };
  return (
    <ToolWorkspace
      status={supported === false ? "error" : "idle"}
      error={supported === false ? { cause: "This browser can't read text aloud (no speech synthesis)." } : null}
      input={
        <div className="space-y-3">
          <textarea
            aria-label="Text to read"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={20000}
            className={area}
          />
          {at && (
            <p data-testid="tts-reading" className="rounded-2xl border border-line bg-soft p-3 text-sm leading-relaxed">
              {text.slice(Math.max(0, at[0] - 60), at[0])}
              <mark className="rounded bg-[var(--accentSoft)] text-ink">{text.slice(at[0], at[1])}</mark>
              {text.slice(at[1], at[1] + 60)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {state === "idle" ? (
              <button
                type="button"
                data-testid="primary-action"
                disabled={!supported || !text.trim()}
                onClick={speak}
                className="h-12 rounded-full bg-ink px-6 font-semibold text-bg disabled:opacity-40"
              >
                ▶ Read aloud
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="h-12 rounded-full border border-line px-5"
                  onClick={() =>
                    state === "paused"
                      ? (speechSynthesis.resume(), setState("speaking"))
                      : (speechSynthesis.pause(), setState("paused"))
                  }
                >
                  {state === "paused" ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  className="h-12 rounded-full border border-line px-5"
                  onClick={() => (speechSynthesis.cancel(), setState("idle"), setAt(null))}
                >
                  Stop
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-ink2">
            Uses your device&apos;s own voices, so they differ between phones and computers. Browsers don&apos;t allow
            saving the audio as a file.
          </p>
        </div>
      }
      settings={
        <>
          <Field label="Voice">
            <select value={voice} onChange={(e) => setVoice(e.target.value)} className={`${inputClass} max-w-64`}>
              <option value="">Default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Speed">
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(+e.target.value)}
              className="kk-range w-32"
            />
          </Field>
          <Field label="Pitch">
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={pitch}
              onChange={(e) => setPitch(+e.target.value)}
              className="kk-range w-32"
            />
          </Field>
        </>
      }
    />
  );
}

// ───────────────────────── Résumé builder ─────────────────────────
const EMPTY: Resume = {
  name: "Asha Rao",
  headline: "Product designer",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  location: "Bengaluru, India",
  links: "linkedin.com/in/asharao",
  summary:
    "Designer with 6 years of experience making calm, fast tools. Led the redesign of a file-conversion app used by 2 million people.",
  experience: [
    {
      role: "Senior Product Designer",
      company: "KlipKit",
      dates: "2023 – now",
      bullets:
        "Redesigned the home page; time to first result fell by 40%\nBuilt the design system used across 70 tools",
    },
  ],
  education: [{ degree: "B.Des., Interaction Design", school: "NID Ahmedabad", dates: "2015 – 2019" }],
  skills: "Figma, Prototyping, User research, Design systems, HTML/CSS",
};

export function ResumeBuilder({ slug, next }: ToolProps) {
  const [r, setR] = useState<Resume>(EMPTY);
  const [template, setTemplate] = useState<"classic" | "modern">("modern");
  const [accent, setAccent] = useState("#6d5df5");
  useEffect(() => setR(store.get("kk-resume", EMPTY)), []);
  useEffect(() => store.set("kk-resume", r), [r]);
  const job = useToolRun<{ blob: Blob; pages: number }>();
  const set = <K extends keyof Resume>(k: K, v: Resume[K]) => (setR((x) => ({ ...x, [k]: v })), job.reset());
  const input = (label: string, k: "name" | "headline" | "email" | "phone" | "location") => (
    <Field label={label}>
      <input value={r[k]} onChange={(e) => set(k, e.target.value)} className={`${inputClass} w-full`} />
    </Field>
  );
  const start = () => job.run(() => pdfWorker.call("resume", { r, template, accent }));
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      input={
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {input("Full name", "name")}
            {input("Headline", "headline")}
            {input("Email", "email")}
            {input("Phone", "phone")}
            {input("Location", "location")}
            <Field label="Links (one per line)">
              <textarea value={r.links} onChange={(e) => set("links", e.target.value)} rows={2} className={area} />
            </Field>
          </div>
          <Field label="Summary">
            <textarea value={r.summary} onChange={(e) => set("summary", e.target.value)} rows={3} className={area} />
          </Field>
          <fieldset className="space-y-3 rounded-2xl border border-line p-3">
            <legend className="px-2 text-sm font-medium text-ink">Experience</legend>
            {r.experience.map((e, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-3">
                {(["role", "company", "dates"] as const).map((k) => (
                  <input
                    key={k}
                    aria-label={`Job ${i + 1} ${k}`}
                    placeholder={k[0].toUpperCase() + k.slice(1)}
                    value={e[k]}
                    onChange={(ev) =>
                      set(
                        "experience",
                        r.experience.map((x, j) => (j === i ? { ...x, [k]: ev.target.value } : x)),
                      )
                    }
                    className={inputClass}
                  />
                ))}
                <textarea
                  aria-label={`Job ${i + 1} achievements`}
                  placeholder="One achievement per line"
                  value={e.bullets}
                  onChange={(ev) =>
                    set(
                      "experience",
                      r.experience.map((x, j) => (j === i ? { ...x, bullets: ev.target.value } : x)),
                    )
                  }
                  rows={3}
                  className={`${area} sm:col-span-3`}
                />
                <button
                  type="button"
                  className="h-11 w-fit rounded-full border border-line px-4 text-sm sm:h-10"
                  onClick={() =>
                    set(
                      "experience",
                      r.experience.filter((_, j) => j !== i),
                    )
                  }
                >
                  Remove job
                </button>
              </div>
            ))}
            <button
              type="button"
              className="h-11 rounded-full border border-line px-4 text-sm"
              onClick={() => set("experience", [...r.experience, { role: "", company: "", dates: "", bullets: "" }])}
            >
              + Add job
            </button>
          </fieldset>
          <fieldset className="space-y-3 rounded-2xl border border-line p-3">
            <legend className="px-2 text-sm font-medium text-ink">Education</legend>
            {r.education.map((e, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-3">
                {(["degree", "school", "dates"] as const).map((k) => (
                  <input
                    key={k}
                    aria-label={`Education ${i + 1} ${k}`}
                    placeholder={k[0].toUpperCase() + k.slice(1)}
                    value={e[k]}
                    onChange={(ev) =>
                      set(
                        "education",
                        r.education.map((x, j) => (j === i ? { ...x, [k]: ev.target.value } : x)),
                      )
                    }
                    className={inputClass}
                  />
                ))}
              </div>
            ))}
            <button
              type="button"
              className="h-11 rounded-full border border-line px-4 text-sm"
              onClick={() => set("education", [...r.education, { degree: "", school: "", dates: "" }])}
            >
              + Add education
            </button>
          </fieldset>
          <Field label="Skills (comma or line separated)">
            <textarea value={r.skills} onChange={(e) => set("skills", e.target.value)} rows={2} className={area} />
          </Field>
        </div>
      }
      settings={
        <>
          <Field label="Template">
            <select
              value={template}
              onChange={(e) => (setTemplate(e.target.value as typeof template), job.reset())}
              className={inputClass}
            >
              <option value="modern">Modern (colour header)</option>
              <option value="classic">Classic</option>
            </select>
          </Field>
          {template === "modern" && (
            <Field label="Accent">
              <input
                type="color"
                value={accent}
                onChange={(e) => (setAccent(e.target.value), job.reset())}
                className="h-11 w-14 rounded-xl border border-line bg-solid"
              />
            </Field>
          )}
          <button
            type="button"
            className="h-11 rounded-full border border-line px-4 text-sm"
            onClick={() =>
              setR({
                name: "",
                headline: "",
                email: "",
                phone: "",
                location: "",
                links: "",
                summary: "",
                experience: [],
                education: [],
                skills: "",
              })
            }
          >
            Start blank
          </button>
          <p className="basis-full text-xs text-ink2">Your draft is saved in this browser only.</p>
        </>
      }
      action={{ label: "Make PDF", onClick: start, disabled: !r.name.trim() }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={`${job.result.pages} page${job.result.pages === 1 ? "" : "s"} · ${formatBytes(job.result.blob.size)}`}
          >
            <ResultActions
              items={[
                {
                  name: `${r.name.trim().replace(/\s+/g, "-") || "resume"}-resume.pdf`,
                  type: "application/pdf",
                  blob: job.result.blob,
                },
              ]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}
