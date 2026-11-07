"use client";
/**
 * Video and audio tools: Compress, Convert, Trim, Video to GIF, Extract Audio, Audio Converter (Mediabunny +
 * WebCodecs in a worker) and Screen Recorder (getDisplayMedia + MediaRecorder). Nothing is uploaded.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { FileChip } from "@/components/tool/FileChip";
import { ResultActions, useHandoff } from "@/components/tool/ToolChrome";
import { ResultRow } from "@/components/tool/ResultRow";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/tool/ToolWorkspace";
import { formatBytes } from "@/lib/utils";
import { stem } from "@/lib/engines/pages";
import { fmtTime, parseTime } from "@/lib/engines/gif";
import { mediaWorker } from "@/workers/clients";
import type { Probe } from "@/workers/media-ops";
import type { ToolProps } from "./types";

const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv,.m4v";
const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.webm";
const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  gif: "image/gif",
};

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

/** One media file, probed in the worker (duration, size, tracks). WebCodecs missing → a clear error. */
function useMedia(kind: "video" | "audio" | "any") {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<Probe | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useHandoff((items) => {
    const f = items.find(
      (i) => (i.type.startsWith("video/") || (kind !== "video" && i.type.startsWith("audio/"))) && i.blob,
    );
    if (f) setFile(new File([f.blob!], f.name, { type: f.type }));
  });
  useEffect(() => {
    setInfo(null);
    setErr(null);
    if (!file) return;
    if (typeof VideoEncoder === "undefined" && typeof AudioEncoder === "undefined") {
      setErr("This browser can't process video or audio (no WebCodecs). Use a recent Chrome, Edge or Safari 17+.");
      return;
    }
    let cancelled = false;
    mediaWorker
      .call("probe", { file })
      .then((p) => {
        if (cancelled) return;
        if (kind === "video" && !p.hasVideo)
          setErr("This file has no video. For audio files, use the Audio Converter.");
        else setInfo(p);
      })
      .catch((e: Error) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [file, kind]);
  return { file, setFile, info, err };
}

function MediaInput({
  file,
  info,
  onFile,
  onClear,
  accept,
  label,
  hint,
  noun,
}: {
  file: File | null;
  info: Probe | null;
  onFile: (f: File) => void;
  onClear: () => void;
  accept: string;
  label: string;
  hint: string;
  noun: string;
}) {
  return file ? (
    <div className="space-y-2">
      <FileChip files={[file]} noun={noun} onChange={onClear} />
      {info && (
        <p data-testid="media-info" className="text-sm text-ink2">
          {fmtTime(info.duration)} · {info.hasVideo ? `${info.width}×${info.height}` : "audio only"}
          {info.hasVideo && !info.hasAudio && " · no sound"} · {info.format}
        </p>
      )}
    </div>
  ) : (
    <Dropzone accept={accept} typeLabel={label} maxFileMb={2048} onFiles={([f]) => onFile(f)} hint={hint} />
  );
}

const noCodecs = (e: Error) => ({
  cause: e.message,
  fix: /encode|WebCodecs/.test(e.message)
    ? undefined
    : "Very long or unusual files can fail in the browser. Try a shorter clip.",
});

// ───────────────────────── Compress ─────────────────────────
export function VideoCompressor({ slug, next }: ToolProps) {
  const m = useMedia("video");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [maxH, setMaxH] = useState(1080);
  const [targetMB, setTargetMB] = useState<number | "">("");
  const job = useToolRun<{ blob: Blob; ext: string; originalSize: number; note?: string }>();
  const start = () =>
    job.run(
      (onProgress) =>
        mediaWorker.call(
          "compress",
          { file: m.file!, quality, maxHeight: maxH || undefined, targetMB: targetMB || undefined },
          { onProgress },
        ),
      noCodecs,
    );
  return (
    <ToolWorkspace
      status={m.err ? "error" : job.status}
      progress={job.progress}
      error={m.err ? { cause: m.err } : job.error}
      onRetry={() => (m.setFile(null), job.reset())}
      input={
        <MediaInput
          {...m}
          onFile={(f) => (m.setFile(f), job.reset())}
          onClear={() => (m.setFile(null), job.reset())}
          accept={VIDEO_ACCEPT}
          label="a video (MP4, WebM, MOV)"
          hint="MP4, WebM or MOV"
          noun="video"
        />
      }
      settings={
        <>
          <Field label="Quality">
            <select
              value={quality}
              onChange={(e) => (setQuality(e.target.value as typeof quality), job.reset())}
              className={inputClass}
              disabled={!!targetMB}
            >
              <option value="high">High (bigger file)</option>
              <option value="medium">Balanced</option>
              <option value="low">Small file</option>
            </select>
          </Field>
          <Field label="Max height">
            <select value={maxH} onChange={(e) => (setMaxH(+e.target.value), job.reset())} className={inputClass}>
              <option value={0}>Keep</option>
              <option value={1080}>1080p</option>
              <option value={720}>720p</option>
              <option value={480}>480p</option>
            </select>
          </Field>
          <Field label="Or target size (MB)">
            <input
              type="number"
              min={1}
              placeholder="e.g. 25"
              value={targetMB}
              onChange={(e) => (setTargetMB(e.target.value ? +e.target.value : ""), job.reset())}
              className={`${inputClass} w-32`}
            />
          </Field>
        </>
      }
      action={{ label: "Compress video", onClick: start, disabled: !m.info }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-2">
            <ResultRow before={job.result.originalSize} after={job.result.blob.size}>
              <ResultActions
                items={[
                  {
                    name: `${stem(m.file!.name)}-compressed.${job.result.ext}`,
                    type: job.result.blob.type,
                    blob: job.result.blob,
                  },
                ]}
                next={next}
                from={slug}
              />
            </ResultRow>
            {job.result.note && <p className="text-sm text-ink2">{job.result.note}</p>}
          </div>
        )
      }
    />
  );
}

// ───────────────────────── Convert ─────────────────────────
export function VideoConverter({ slug, next }: ToolProps) {
  const m = useMedia("video");
  const [to, setTo] = useState<"mp4" | "webm" | "mov">("mp4");
  const job = useToolRun<{ blob: Blob; ext: string; note?: string }>();
  const start = () =>
    job.run((onProgress) => mediaWorker.call("convert", { file: m.file!, to }, { onProgress }), noCodecs);
  return (
    <ToolWorkspace
      status={m.err ? "error" : job.status}
      progress={job.progress}
      error={m.err ? { cause: m.err } : job.error}
      onRetry={() => (m.setFile(null), job.reset())}
      input={
        <MediaInput
          {...m}
          onFile={(f) => (m.setFile(f), job.reset())}
          onClear={() => (m.setFile(null), job.reset())}
          accept={VIDEO_ACCEPT}
          label="a video (MP4, WebM, MOV, MKV)"
          hint="MP4, WebM, MOV or MKV"
          noun="video"
        />
      }
      settings={
        <Field label="Convert to">
          <select value={to} onChange={(e) => (setTo(e.target.value as typeof to), job.reset())} className={inputClass}>
            <option value="mp4">MP4 (H.264, plays everywhere)</option>
            <option value="webm">WebM (VP9)</option>
            <option value="mov">MOV (QuickTime)</option>
          </select>
        </Field>
      }
      action={{ label: `Convert to ${to.toUpperCase()}`, onClick: start, disabled: !m.info }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-2">
            <Done text={`${job.result.ext.toUpperCase()} · ${formatBytes(job.result.blob.size)}`}>
              <ResultActions
                items={[
                  {
                    name: `${stem(m.file!.name)}.${job.result.ext}`,
                    type: job.result.blob.type,
                    blob: job.result.blob,
                  },
                ]}
                next={next}
                from={slug}
              />
            </Done>
            {job.result.note && <p className="text-sm text-ink2">{job.result.note}</p>}
          </div>
        )
      }
    />
  );
}

// ───────────────────────── Trim (video or audio) and GIF ─────────────────────────
function useRange(info: Probe | null) {
  const [start, setStart] = useState("0:00");
  const [end, setEnd] = useState("0:05");
  useEffect(() => {
    if (info) {
      setStart("0:00");
      setEnd(fmtTime(Math.min(info.duration, 5)));
    }
  }, [info]);
  const parsed = useMemo(() => {
    try {
      const s = parseTime(start);
      const e = parseTime(end);
      if (!(e > s)) return { error: "The end must be after the start." };
      if (info && s >= info.duration) return { error: `The clip is only ${fmtTime(info.duration)} long.` };
      return { s, e: info ? Math.min(e, info.duration) : e };
    } catch (x) {
      return { error: (x as Error).message };
    }
  }, [start, end, info]);
  return { start, end, setStart, setEnd, parsed };
}

function Preview({ file, video, onTime }: { file: File; video: boolean; onTime: (t: number) => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  return video ? (
    <video
      ref={ref}
      src={url}
      controls
      muted
      playsInline
      className="max-h-72 w-full rounded-2xl bg-black"
      onTimeUpdate={(e) => onTime(e.currentTarget.currentTime)}
    />
  ) : (
    <audio ref={ref} src={url} controls className="w-full" onTimeUpdate={(e) => onTime(e.currentTarget.currentTime)} />
  );
}

function RangeFields({ r, now }: { r: ReturnType<typeof useRange>; now: number }) {
  return (
    <>
      <Field label="Start">
        <input value={r.start} onChange={(e) => r.setStart(e.target.value)} className={`${inputClass} w-28`} />
      </Field>
      <button
        type="button"
        className="h-11 rounded-full border border-line px-3 text-sm"
        onClick={() => r.setStart(fmtTime(Math.round(now * 10) / 10))}
      >
        Start here
      </button>
      <Field label="End">
        <input value={r.end} onChange={(e) => r.setEnd(e.target.value)} className={`${inputClass} w-28`} />
      </Field>
      <button
        type="button"
        className="h-11 rounded-full border border-line px-3 text-sm"
        onClick={() => r.setEnd(fmtTime(Math.round(now * 10) / 10))}
      >
        End here
      </button>
      {"error" in r.parsed && (
        <p className="basis-full text-sm text-[var(--g-p)]" role="alert">
          {r.parsed.error}
        </p>
      )}
    </>
  );
}

export function VideoTrimmer({ slug, next }: ToolProps) {
  const m = useMedia("any");
  const r = useRange(m.info);
  const [now, setNow] = useState(0);
  const job = useToolRun<{ blob: Blob; ext: string; length: number }>();
  const start = () => {
    const p = r.parsed as { s: number; e: number };
    job.run(
      (onProgress) => mediaWorker.call("trim", { file: m.file!, start: p.s, end: p.e }, { onProgress }),
      noCodecs,
    );
  };
  return (
    <ToolWorkspace
      status={m.err ? "error" : job.status}
      progress={job.progress}
      error={m.err ? { cause: m.err } : job.error}
      onRetry={() => (m.setFile(null), job.reset())}
      input={
        <div className="space-y-3">
          <MediaInput
            {...m}
            onFile={(f) => (m.setFile(f), job.reset())}
            onClear={() => (m.setFile(null), job.reset())}
            accept={`${VIDEO_ACCEPT},${AUDIO_ACCEPT}`}
            label="a video or audio file"
            hint="Video (MP4, WebM, MOV) or audio (MP3, WAV, M4A)"
            noun="file"
          />
          {m.file && m.info && <Preview file={m.file} video={m.info.hasVideo} onTime={setNow} />}
        </div>
      }
      settings={m.info && <RangeFields r={r} now={now} />}
      action={{ label: "Cut clip", onClick: start, disabled: !m.info || "error" in r.parsed }}
      result={
        job.status === "done" &&
        job.result && (
          <Done text={`${fmtTime(job.result.length)} clip · ${formatBytes(job.result.blob.size)}`}>
            <ResultActions
              items={[
                {
                  name: `${stem(m.file!.name)}-clip.${job.result.ext}`,
                  type: job.result.blob.type,
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

export function VideoToGif({ slug, next }: ToolProps) {
  const m = useMedia("video");
  const r = useRange(m.info);
  const [now, setNow] = useState(0);
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  const job = useToolRun<{ blob: Blob; frames: number; width: number; height: number }>();
  const start = () => {
    const p = r.parsed as { s: number; e: number };
    job.run(
      (onProgress) => mediaWorker.call("gif", { file: m.file!, start: p.s, end: p.e, fps, width }, { onProgress }),
      noCodecs,
    );
  };
  return (
    <ToolWorkspace
      status={m.err ? "error" : job.status}
      progress={job.progress}
      error={m.err ? { cause: m.err } : job.error}
      onRetry={() => (m.setFile(null), job.reset())}
      input={
        <div className="space-y-3">
          <MediaInput
            {...m}
            onFile={(f) => (m.setFile(f), job.reset())}
            onClear={() => (m.setFile(null), job.reset())}
            accept={VIDEO_ACCEPT}
            label="a video (MP4, WebM, MOV)"
            hint="MP4, WebM or MOV · GIFs up to 30 seconds"
            noun="video"
          />
          {m.file && m.info && <Preview file={m.file} video onTime={setNow} />}
        </div>
      }
      settings={
        m.info && (
          <>
            <RangeFields r={r} now={now} />
            <Field label="Frames per second">
              <select value={fps} onChange={(e) => (setFps(+e.target.value), job.reset())} className={inputClass}>
                <option value={5}>5 (smallest)</option>
                <option value={10}>10</option>
                <option value={15}>15 (smoothest)</option>
              </select>
            </Field>
            <Field label="Width">
              <select value={width} onChange={(e) => (setWidth(+e.target.value), job.reset())} className={inputClass}>
                <option value={320}>320 px</option>
                <option value={480}>480 px</option>
                <option value={640}>640 px</option>
              </select>
            </Field>
          </>
        )
      }
      action={{ label: "Make GIF", onClick: start, disabled: !m.info || "error" in r.parsed }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            {}
            <GifPreview blob={job.result.blob} />
            <Done
              text={`${job.result.width}×${job.result.height} · ${job.result.frames} frames · ${formatBytes(job.result.blob.size)}`}
            >
              <ResultActions
                items={[{ name: `${stem(m.file!.name)}.gif`, type: "image/gif", blob: job.result.blob }]}
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
function GifPreview({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="GIF preview" className="mx-auto max-h-72 rounded-xl" />;
}

// ───────────────────────── Audio ─────────────────────────
function AudioOut({ video, slug, next }: ToolProps & { video: boolean }) {
  const m = useMedia(video ? "video" : "any");
  const [to, setTo] = useState<"m4a" | "wav" | "webm" | "ogg">("m4a");
  const [trim, setTrim] = useState(false);
  const r = useRange(m.info);
  const [now, setNow] = useState(0);
  const job = useToolRun<{ blob: Blob; ext: string; duration: number; note?: string }>();
  const range = trim && !("error" in r.parsed) ? { start: r.parsed.s, end: r.parsed.e } : {};
  const start = () =>
    job.run((onProgress) => mediaWorker.call("audio", { file: m.file!, to, ...range }, { onProgress }), noCodecs);
  const noAudio = m.info && !m.info.hasAudio;
  return (
    <ToolWorkspace
      status={m.err ? "error" : job.status}
      progress={job.progress}
      error={m.err ? { cause: m.err } : job.error}
      onRetry={() => (m.setFile(null), job.reset())}
      input={
        <div className="space-y-2">
          <MediaInput
            {...m}
            onFile={(f) => (m.setFile(f), job.reset())}
            onClear={() => (m.setFile(null), job.reset())}
            accept={video ? VIDEO_ACCEPT : `${AUDIO_ACCEPT},${VIDEO_ACCEPT}`}
            label={video ? "a video (MP4, WebM, MOV)" : "an audio or video file"}
            hint={video ? "MP4, WebM or MOV" : "MP3, WAV, M4A, OGG, FLAC (or a video)"}
            noun={video ? "video" : "file"}
          />
          {noAudio && (
            <p className="text-sm text-[var(--g-p)]" role="alert">
              This file has no sound to extract.
            </p>
          )}
          {!video && m.file && m.info && <Preview file={m.file} video={false} onTime={setNow} />}
        </div>
      }
      settings={
        <>
          {!video && m.info && (
            <label className="flex h-11 basis-full items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="size-4"
                checked={trim}
                onChange={(e) => (setTrim(e.target.checked), job.reset())}
              />{" "}
              Trim
            </label>
          )}
          {trim && m.info && <RangeFields r={r} now={now} />}
          <Field label="Save as">
            <select
              value={to}
              onChange={(e) => (setTo(e.target.value as typeof to), job.reset())}
              className={inputClass}
            >
              <option value="m4a">M4A (AAC, small, plays everywhere)</option>
              <option value="wav">WAV (lossless, large)</option>
              <option value="webm">WebM (Opus)</option>
              <option value="ogg">OGG (Opus)</option>
            </select>
          </Field>
        </>
      }
      action={{
        label: video ? "Extract audio" : `Convert to ${to.toUpperCase()}`,
        onClick: start,
        disabled: !m.info || !!noAudio || (trim && "error" in r.parsed),
      }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-2">
            <Done
              text={`${job.result.ext.toUpperCase()} · ${fmtTime(job.result.duration)} · ${formatBytes(job.result.blob.size)}`}
            >
              <ResultActions
                items={[
                  {
                    name: `${stem(m.file!.name)}.${job.result.ext}`,
                    type: TYPES[job.result.ext] ?? job.result.blob.type,
                    blob: job.result.blob,
                  },
                ]}
                next={next}
                from={slug}
              />
            </Done>
            {job.result.note && <p className="text-sm text-ink2">{job.result.note}</p>}
          </div>
        )
      }
    />
  );
}
export const ExtractAudio = (p: ToolProps) => <AudioOut {...p} video />;
export const AudioConverter = (p: ToolProps) => <AudioOut {...p} video={false} />;

// ───────────────────────── Screen recorder ─────────────────────────
export function ScreenRecorder({ slug, next }: ToolProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [mic, setMic] = useState(false);
  const [state, setState] = useState<"idle" | "recording">("idle");
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; seconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const streams = useRef<MediaStream[]>([]);
  useEffect(() => setSupported(!!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== "undefined"), []);
  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);
  const stopAll = () => streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
  useEffect(() => () => stopAll(), []);

  const begin = async () => {
    setError(null);
    setResult(null);
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      streams.current = [screen];
      const tracks = [...screen.getTracks()];
      if (mic) {
        const m = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (m) {
          streams.current.push(m);
          tracks.push(...m.getAudioTracks());
        }
      }
      const type =
        ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const r = new MediaRecorder(new MediaStream(tracks), type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      const started = Date.now();
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stopAll();
        setState("idle");
        const blob = new Blob(chunks, { type: r.mimeType || "video/webm" });
        setResult({ blob, seconds: Math.round((Date.now() - started) / 1000) });
      };
      // the browser's own "Stop sharing" button ends the screen track
      screen.getVideoTracks()[0].addEventListener("ended", () => r.state === "recording" && r.stop());
      r.start(1000);
      rec.current = r;
      setSeconds(0);
      setState("recording");
    } catch (e) {
      stopAll();
      const name = (e as Error).name;
      setError(
        name === "NotAllowedError"
          ? "Screen sharing was cancelled or blocked."
          : `Couldn't start recording: ${(e as Error).message}`,
      );
    }
  };
  const ext = result?.blob.type.includes("mp4") ? "mp4" : "webm";
  return (
    <ToolWorkspace
      status={error ? "error" : "idle"}
      error={error ? { cause: error } : null}
      input={
        supported === false ? (
          <p className="rounded-2xl border border-line bg-soft p-4 text-sm text-ink" role="alert">
            Screen recording needs a desktop browser (Chrome, Edge, Firefox or Safari on a computer). Phones and tablets
            don&apos;t allow it.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink2">
              Choose a tab, window or your whole screen. The recording stays on your device until you download it.
            </p>
            <label className="flex h-11 items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="size-4"
                checked={mic}
                disabled={state === "recording"}
                onChange={(e) => setMic(e.target.checked)}
              />{" "}
              Also record my microphone
            </label>
            {state === "recording" ? (
              <button
                type="button"
                data-testid="stop-recording"
                onClick={() => rec.current?.stop()}
                className="h-12 rounded-full bg-[var(--bad,#e5484d)] px-6 font-semibold text-white"
              >
                ■ Stop · {fmtTime(seconds)}
              </button>
            ) : (
              <button
                type="button"
                data-testid="primary-action"
                disabled={!supported}
                onClick={begin}
                className="h-12 rounded-full bg-ink px-6 font-semibold text-bg disabled:opacity-40"
              >
                ● Start recording
              </button>
            )}
          </div>
        )
      }
      result={
        result && (
          <div className="space-y-3">
            <BlobVideo blob={result.blob} />
            <Done text={`${fmtTime(result.seconds)} · ${formatBytes(result.blob.size)}`}>
              <ResultActions
                items={[{ name: `screen-recording.${ext}`, type: result.blob.type, blob: result.blob }]}
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

function BlobVideo({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <video data-testid="recording" src={url} controls className="max-h-72 w-full rounded-2xl bg-black" />;
}
