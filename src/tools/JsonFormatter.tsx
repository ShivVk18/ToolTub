"use client";
import { useEffect, useState } from "react";
import { ResultActions, useHandoff } from "@/components/workspace/ToolChrome";
import { Field, ToolWorkspace, inputClass } from "@/components/workspace/ToolWorkspace";
import { formatJson, type JsonResult } from "@/workers/json-ops";
import { jsonWorker } from "@/workers/clients";
import type { ToolProps } from "./types";

const SAMPLE = `{"name":"KlipKit","tools":78,"private":true,"categories":["productivity","developer","creator"],"limits":{"maxFileMb":50}}`;
const WORKER_THRESHOLD = 1_000_000; // characters; above this, parse off the main thread

/** [Own] JSON Formatter: formats as you type. No primary button needed: the result is always live. */
export function JsonFormatter({ slug, next }: ToolProps) {
  const [text, setText] = useState("");
  const [indent, setIndent] = useState<"2" | "4" | "tab" | "min">("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [stripComments, setStripComments] = useState(false);
  const [lastRes, setRes] = useState<JsonResult | null>(null);

  const res = text.trim() ? lastRes : null;

  useHandoff((items) => items[0]?.text && setText(items[0].text));

  useEffect(() => {
    if (!text.trim()) return;
    const job = { text, indent: indent === "tab" ? ("\t" as const) : indent === "min" ? (0 as const) : Number(indent), sortKeys, stripComments };
    let alive = true;
    const t = setTimeout(async () => {
      const r = text.length > WORKER_THRESHOLD ? await jsonWorker.call("format", job) : formatJson(job);
      if (alive) setRes(r);
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [text, indent, sortKeys, stripComments]);

  return (
    <ToolWorkspace
      status={res && !res.ok ? "error" : "idle"}
      error={res && !res.ok ? { cause: `Invalid JSON at line ${res.line}, column ${res.column}`, fix: res.hint } : null}
      input={
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onDrop={async (e) => {
              const f = e.dataTransfer.files[0];
              if (f) {
                e.preventDefault();
                setText(await f.text());
              }
            }}
            spellCheck={false}
            aria-label="JSON input"
            placeholder="Paste JSON here, or drop a .json file"
            className="h-56 w-full resize-y rounded-lg border border-border bg-bg p-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button className="text-xs text-fg-muted underline" onClick={() => setText(SAMPLE)}>
            Try a sample
          </button>
        </div>
      }
      settings={
        <>
          <Field label="Indent">
            <select value={indent} onChange={(e) => setIndent(e.target.value as typeof indent)} className={inputClass}>
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tabs</option>
              <option value="min">Minify</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} /> Sort keys
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={stripComments} onChange={(e) => setStripComments(e.target.checked)} /> Strip comments
          </label>
        </>
      }
      result={
        res?.ok && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Valid JSON</p>
            <pre className="max-h-[28rem] overflow-auto rounded-lg bg-muted p-3 font-mono text-sm">{res.output}</pre>
            <ResultActions items={[{ name: "formatted.json", type: "application/json", text: res.output, blob: new Blob([res.output], { type: "application/json" }) }]} next={next} from={slug} />
          </div>
        )
      }
    />
  );
}
