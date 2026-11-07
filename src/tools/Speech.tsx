"use client";
/** Transcription and the Subtitle Generator & Editor: Whisper on the device (whisper.worker.ts). Nothing is uploaded. */
import { useEffect, useMemo, useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { FileChip } from "@/components/tool/FileChip";
import { ResultActions, useHandoff } from "@/components/tool/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/tool/ToolWorkspace";
import { stem } from "@/lib/engines/pages";
import { fmtTime, parseTime } from "@/lib/engines/gif";
import { parseSubtitles, shiftSegments, splitLong, toSrt, toVtt, type Segment } from "@/lib/engines/whisper";
import { to16kMono } from "@/lib/audio";
import { whisperWorker } from "@/workers/clients";
import type { ToolProps } from "./types";

const MEDIA_ACCEPT = "audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.mp4,.webm,.mov,.mkv";
const LANGS: [string, string][] = [
  ["auto", "Detect automatically"],
  ["en", "English"],
  ["hi", "Hindi"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh", "Chinese"],
  ["ar", "Arabic"],
  ["bn", "Bengali"],
  ["ru", "Russian"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["mr", "Marathi"],
];
const LANG_NAME = Object.fromEntries(LANGS);

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

function useMediaFile() {
  const [file, setFile] = useState<File | null>(null);
  useHandoff((items) => {
    const f = items.find((i) => (i.type.startsWith("audio/") || i.type.startsWith("video/")) && i.blob);
    if (f) setFile(new File([f.blob!], f.name, { type: f.type }));
  });
  return [file, setFile] as const;
}
const modelFix = (e: Error) => ({
  cause: e.message,
  fix: /isn't available/.test(e.message)
    ? "The speech model (about 41 MB) needs to be installed on the server first."
    : /no audio|too short/.test(e.message)
      ? undefined
      : "The first run downloads the speech model once (about 41 MB); after that it works offline.",
});

// ───────────────────────── Transcription ─────────────────────────
export function Transcription({ slug, next }: ToolProps) {
  const [file, setFile] = useMediaFile();
  const [lang, setLang] = useState("auto");
  const [stamps, setStamps] = useState(false);
  const job = useToolRun<{ text: string; segments: Segment[]; language: string; seconds: number }>();
  const start = () =>
    job.run(async (onProgress) => {
      onProgress({ label: "Reading the audio…" });
      const audio = await to16kMono(file!);
      const r = await whisperWorker.call(
        "transcribe",
        { audio, language: lang, timestamps: stamps },
        { transfer: [audio.buffer], onProgress },
      );
      if (!r.text) throw new Error("No speech found in this recording.");
      return { ...r, seconds: audio.length / 16000 };
    }, modelFix);
  const out = job.result
    ? stamps
      ? job.result.segments.map((s) => `[${fmtTime(s.start)}] ${s.text}`).join("\n")
      : job.result.text
    : "";
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={
        file ? (
          <FileChip files={[file]} noun="recording" onChange={() => (setFile(null), job.reset())} />
        ) : (
          <Dropzone
            accept={MEDIA_ACCEPT}
            typeLabel="an audio or video file"
            maxFileMb={500}
            onFiles={([f]) => (setFile(f), job.reset())}
            hint="Audio or video up to 15 minutes"
          />
        )
      }
      settings={
        <>
          <Field label="Language">
            <select value={lang} onChange={(e) => (setLang(e.target.value), job.reset())} className={inputClass}>
              {LANGS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex h-11 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="size-4"
              checked={stamps}
              onChange={(e) => (setStamps(e.target.checked), job.reset())}
            />{" "}
            Add timestamps
          </label>
          <p className="basis-full text-xs text-ink2">
            Runs on your device with Whisper (tiny). Clear speech works best; accuracy drops with music or many voices.
          </p>
        </>
      }
      action={{ label: "Transcribe", onClick: start, disabled: !file }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <textarea
              data-testid="transcript"
              readOnly
              value={out}
              aria-label="Transcript"
              className="h-64 w-full rounded-2xl border border-line bg-solid p-4 text-sm leading-relaxed text-ink"
            />
            <Done
              text={`${out.split(/\s+/).filter(Boolean).length} words · ${fmtTime(job.result.seconds)} · ${LANG_NAME[job.result.language] ?? job.result.language}`}
            >
              <ResultActions
                items={[
                  {
                    name: `${stem(file!.name)}.txt`,
                    type: "text/plain",
                    text: out,
                    blob: new Blob([out], { type: "text/plain" }),
                  },
                ]}
                next={next}
                from={slug}
              />
            </Done>
          </div>
        )
      }
    />
  );
}

// ───────────────────────── Subtitles ─────────────────────────
export function SubtitleGenerator({ slug }: ToolProps) {
  const [file, setFile] = useMediaFile();
  const [lang, setLang] = useState("auto");
  const [segs, setSegs] = useState<Segment[]>([]);
  const [shift, setShift] = useState("0");
  const [err, setErr] = useState<string | null>(null);
  const job = useToolRun<Segment[]>();
  const isSubs = (f: File) => /\.(srt|vtt)$/i.test(f.name);
  const take = async (f: File) => {
    setErr(null);
    job.reset();
    if (isSubs(f)) {
      try {
        setSegs(parseSubtitles(await f.text()));
        setFile(f);
      } catch (e) {
        setErr((e as Error).message);
      }
    } else {
      setSegs([]);
      setFile(f);
    }
  };
  const start = () =>
    job.run(async (onProgress) => {
      onProgress({ label: "Reading the audio…" });
      const audio = await to16kMono(file!);
      const r = await whisperWorker.call(
        "transcribe",
        { audio, language: lang, timestamps: true },
        { transfer: [audio.buffer], onProgress },
      );
      if (!r.segments.length) throw new Error("No speech found in this recording.");
      const s = splitLong(r.segments);
      setSegs(s);
      return s;
    }, modelFix);
  const edit = (i: number, patch: Partial<Segment>) =>
    setSegs((x) => x.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const base = file ? stem(file.name) : "subtitles";
  const mediaUrl = useMemo(() => (file && !isSubs(file) ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (mediaUrl && URL.revokeObjectURL(mediaUrl)), [mediaUrl]);
  const vttUrl = useMemo(
    () => (segs.length ? URL.createObjectURL(new Blob([toVtt(segs)], { type: "text/vtt" })) : null),
    [segs],
  );
  useEffect(() => () => void (vttUrl && URL.revokeObjectURL(vttUrl)), [vttUrl]);
  const bad = segs.findIndex((s) => !(s.end > s.start) || !s.text.trim());
  return (
    <ToolWorkspace
      status={err ? "error" : job.status}
      progress={job.progress}
      error={err ? { cause: err } : job.error}
      onRetry={() => (setFile(null), setSegs([]), setErr(null), job.reset())}
      input={
        <div className="space-y-3">
          {file ? (
            <FileChip
              files={[file]}
              noun={isSubs(file) ? "subtitle file" : "recording"}
              onChange={() => (setFile(null), setSegs([]), job.reset())}
            />
          ) : (
            <Dropzone
              accept={`${MEDIA_ACCEPT},.srt,.vtt,text/vtt,application/x-subrip`}
              typeLabel="a video, audio, .srt or .vtt file"
              maxFileMb={500}
              onFiles={([f]) => take(f)}
              hint="A video or audio to subtitle, or an .srt/.vtt file to edit"
            />
          )}
          {mediaUrl && file?.type.startsWith("video/") && segs.length > 0 && (
            <video controls src={mediaUrl} className="max-h-72 w-full rounded-2xl bg-black">
              {vttUrl && (
                <track
                  kind="subtitles"
                  src={vttUrl}
                  srcLang={lang === "auto" ? "en" : lang}
                  label="Subtitles"
                  default
                />
              )}
            </video>
          )}
          {segs.length > 0 && (
            <ol data-testid="cues" className="max-h-96 space-y-2 overflow-auto">
              {segs.map((s, i) => (
                <li key={i} className="grid gap-2 rounded-2xl border border-line p-2 sm:grid-cols-[auto_auto_1fr]">
                  {(["start", "end"] as const).map((k) => (
                    <input
                      key={k}
                      aria-label={`Cue ${i + 1} ${k}`}
                      defaultValue={fmtTime(s[k])}
                      onBlur={(e) => {
                        try {
                          edit(i, { [k]: parseTime(e.target.value) });
                        } catch {
                          e.target.value = fmtTime(s[k]);
                        }
                      }}
                      className={`${inputClass} w-28 font-mono`}
                    />
                  ))}
                  <input
                    aria-label={`Cue ${i + 1} text`}
                    value={s.text}
                    onChange={(e) => edit(i, { text: e.target.value })}
                    className={`${inputClass} w-full`}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>
      }
      settings={
        <>
          {file && !isSubs(file) && (
            <Field label="Language">
              <select value={lang} onChange={(e) => (setLang(e.target.value), job.reset())} className={inputClass}>
                {LANGS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {segs.length > 0 && (
            <>
              <Field label="Shift all (seconds)">
                <input
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className={`${inputClass} w-24`}
                  inputMode="decimal"
                />
              </Field>
              <button
                type="button"
                className="h-11 rounded-full border border-line px-4 text-sm"
                onClick={() => !isNaN(+shift) && setSegs((x) => shiftSegments(x, +shift))}
              >
                Apply shift
              </button>
            </>
          )}
        </>
      }
      action={
        file && !isSubs(file)
          ? { label: segs.length ? "Generate again" : "Generate subtitles", onClick: start, disabled: !file }
          : undefined
      }
      result={
        segs.length > 0 && (
          <Done
            text={`${segs.length} cues · ${fmtTime(segs[segs.length - 1].end)}${bad >= 0 ? ` · check cue ${bad + 1}` : ""}`}
          >
            <ResultActions
              items={[
                {
                  name: `${base}.srt`,
                  type: "application/x-subrip",
                  blob: new Blob([toSrt(segs)], { type: "application/x-subrip" }),
                },
                { name: `${base}.vtt`, type: "text/vtt", blob: new Blob([toVtt(segs)], { type: "text/vtt" }) },
              ]}
              separate
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}
