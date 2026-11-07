/**
 * Whisper speech recognition on the device: whisper-tiny (OpenAI, MIT), int8 ONNX, self-hosted under
 * /models/whisper-tiny, run with the self-hosted ONNX Runtime (/vendor/ort). Greedy decoding with the merged
 * decoder's KV cache and Whisper's timestamp rules. Input: 16 kHz mono PCM from the page.
 */
import { serveWorker, type Progress } from "@/lib/worker-rpc";
import {
  CHUNK_SECONDS,
  N_FRAMES,
  N_MELS,
  SAMPLE_RATE,
  logMel,
  decodeTokens,
  segmentsFromTokens,
  type Segment,
} from "@/lib/engines/whisper";

const BASE = "/models/whisper-tiny/";
type Ort = typeof import("onnxruntime-web");
type Session = import("onnxruntime-web").InferenceSession;
type Tensor = import("onnxruntime-web").Tensor;

interface Model {
  ort: Ort;
  encoder: Session;
  decoder: Session;
  idToToken: string[];
  layers: number;
  heads: number;
  headDim: number;
  eot: number;
  sot: number;
  transcribe: number;
  noTimestamps: number;
  tsBegin: number;
  langIds: Record<string, number>;
  suppress: Set<number>;
  beginSuppress: number[];
}
let model: Promise<Model> | null = null;

async function fetchCached(url: string, progress: Progress, label: string): Promise<ArrayBuffer> {
  const cache = await caches.open("klipkit-models-v1").catch(() => null);
  const hit = await cache?.match(url);
  if (hit) return hit.arrayBuffer();
  const res = await fetch(url);
  if (!res.ok) throw new Error("The speech model isn't available on this server yet.");
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body!.getReader();
  const parts: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    if (total)
      progress({
        ratio: got / total,
        label: `${label} (${Math.round(got / 1e6)} of ${Math.round(total / 1e6)} MB, first time only)`,
      });
  }
  const buf = new Uint8Array(got);
  let o = 0;
  for (const p of parts) {
    buf.set(p, o);
    o += p.length;
  }
  await cache?.put(url, new Response(buf));
  return buf.buffer;
}

function load(progress: Progress) {
  return (model ??= (async (): Promise<Model> => {
    const ortUrl = "/vendor/ort/ort.webgpu.bundle.min.mjs";
    const ort: Ort = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ ortUrl);
    ort.env.wasm.wasmPaths = "/vendor/ort/";
    const json = async (f: string) => {
      const r = await fetch(BASE + f);
      if (!r.ok) throw new Error("The speech model isn't available on this server yet.");
      return r.json();
    };
    const [config, gen, vocab, added] = await Promise.all([
      json("config.json"),
      json("generation_config.json"),
      json("vocab.json"),
      json("added_tokens.json"),
    ]);
    const enc = await fetchCached(BASE + "onnx/encoder_model_quantized.onnx", progress, "Downloading the speech model");
    const dec = await fetchCached(
      BASE + "onnx/decoder_model_merged_quantized.onnx",
      progress,
      "Downloading the speech model",
    );
    progress({ label: "Starting the speech model…" });
    const opts = { executionProviders: ["wasm"] };
    const [encoder, decoder] = await Promise.all([
      ort.InferenceSession.create(new Uint8Array(enc), opts),
      ort.InferenceSession.create(new Uint8Array(dec), opts),
    ]);
    const idToToken: string[] = [];
    for (const [t, id] of Object.entries(vocab as Record<string, number>)) idToToken[id] = t;
    for (const [t, id] of Object.entries(added as Record<string, number>)) idToToken[id] = t;
    const noTimestamps = gen.no_timestamps_token_id as number;
    return {
      ort,
      encoder,
      decoder,
      idToToken,
      layers: config.decoder_layers,
      heads: config.decoder_attention_heads,
      headDim: config.d_model / config.decoder_attention_heads,
      eot: config.eos_token_id ?? 50257,
      sot: gen.decoder_start_token_id,
      transcribe: gen.task_to_id.transcribe,
      noTimestamps,
      tsBegin: noTimestamps + 1,
      langIds: Object.fromEntries(
        Object.entries(gen.lang_to_id as Record<string, number>).map(([k, v]) => [k.replace(/[<|>]/g, ""), v]),
      ),
      suppress: new Set<number>(gen.suppress_tokens ?? []),
      beginSuppress: gen.begin_suppress_tokens ?? [],
    };
  })().catch((e) => {
    model = null;
    throw e;
  }));
}

/** One decoder step. `past` null = first step (no cache). Returns last-position logits and the new cache. */
async function step(m: Model, enc: Tensor, ids: number[], past: Record<string, Tensor> | null) {
  const { ort } = m;
  const feeds: Record<string, Tensor> = {
    input_ids: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    encoder_hidden_states: enc,
    use_cache_branch: new ort.Tensor("bool", [past !== null], [1]),
  };
  for (let l = 0; l < m.layers; l++)
    for (const kind of ["decoder", "encoder"])
      for (const kv of ["key", "value"]) {
        const name = `past_key_values.${l}.${kind}.${kv}`;
        feeds[name] = past?.[name] ?? new ort.Tensor("float32", new Float32Array(0), [1, m.heads, 0, m.headDim]);
      }
  const out = await m.decoder.run(feeds);
  const logits = out.logits;
  const [, seq, vocab] = logits.dims as number[];
  const last = (logits.data as Float32Array).subarray((seq - 1) * vocab, seq * vocab);
  const next: Record<string, Tensor> = {};
  for (let l = 0; l < m.layers; l++)
    for (const kv of ["key", "value"]) {
      next[`past_key_values.${l}.decoder.${kv}`] = out[`present.${l}.decoder.${kv}`];
      // encoder cross-attention cache is computed on the first step and reused unchanged
      next[`past_key_values.${l}.encoder.${kv}`] =
        past?.[`past_key_values.${l}.encoder.${kv}`] ?? out[`present.${l}.encoder.${kv}`];
    }
  return { logits: Float32Array.from(last), cache: next };
}

const argmax = (a: Float32Array) => {
  let bi = 0;
  for (let i = 1; i < a.length; i++) if (a[i] > a[bi]) bi = i;
  return bi;
};

export interface TranscribeJob {
  /** 16 kHz mono samples. */
  audio: Float32Array;
  /** ISO code ("en", "hi", …) or "auto". */
  language: string;
  timestamps: boolean;
}
export interface TranscribeResult {
  text: string;
  segments: Segment[];
  language: string;
}

async function transcribe(job: TranscribeJob, progress: Progress): Promise<TranscribeResult> {
  const m = await load(progress);
  const { ort } = m;
  const total = job.audio.length / SAMPLE_RATE;
  if (total < 0.3) throw new Error("The recording is too short to transcribe.");
  if (total > 15 * 60) throw new Error("Transcription works on clips up to 15 minutes. Trim the file first.");
  const segments: Segment[] = [];
  const plain: string[] = [];
  let language = job.language;
  let seek = 0;
  while (seek < total - 0.2) {
    progress({
      ratio: seek / total,
      label: `Transcribing ${Math.floor(seek / 60)}:${String(Math.floor(seek % 60)).padStart(2, "0")} of ${Math.floor(total / 60)}:${String(Math.floor(total % 60)).padStart(2, "0")}…`,
    });
    const chunk = job.audio.subarray(Math.round(seek * SAMPLE_RATE), Math.round((seek + CHUNK_SECONDS) * SAMPLE_RATE));
    const mel = logMel(chunk);
    const encOut = await m.encoder.run({ input_features: new ort.Tensor("float32", mel, [1, N_MELS, N_FRAMES]) });
    const enc = encOut.last_hidden_state;

    if (language === "auto") {
      const { logits } = await step(m, enc, [m.sot], null);
      let best = "en",
        bv = -Infinity;
      for (const [code, id] of Object.entries(m.langIds)) if (logits[id] > bv) [bv, best] = [logits[id], code];
      language = best;
    }
    const langId = m.langIds[language];
    if (langId === undefined) throw new Error(`Unsupported language: ${language}`);
    const prompt = [m.sot, langId, m.transcribe, ...(job.timestamps ? [] : [m.noTimestamps])];
    const out: number[] = [];
    let { logits, cache } = await step(m, enc, prompt, null);
    for (let i = 0; i < 224; i++) {
      for (const s of m.suppress) logits[s] = -Infinity;
      logits[m.noTimestamps] = -Infinity;
      if (i === 0) for (const s of m.beginSuppress) logits[s] = -Infinity;
      if (job.timestamps) {
        const last = out[out.length - 1];
        const lastTs = last !== undefined && last >= m.tsBegin;
        const prevTs = out.length < 2 || out[out.length - 2] >= m.tsBegin;
        if (i === 0) {
          // first token: a timestamp, at most 1 s in
          for (let t = 0; t < m.tsBegin; t++) logits[t] = -Infinity;
          for (let t = m.tsBegin + 51; t < logits.length; t++) logits[t] = -Infinity;
        } else if (lastTs && prevTs) for (let t = m.tsBegin; t < logits.length; t++) logits[t] = -Infinity;
        else if (lastTs) for (let t = 0; t < m.eot; t++) logits[t] = -Infinity;
        const prevStamps = out.filter((t) => t >= m.tsBegin);
        if (prevStamps.length) {
          const floor = prevStamps[prevStamps.length - 1] + (lastTs && !prevTs ? 0 : 1);
          for (let t = m.tsBegin; t < floor; t++) logits[t] = -Infinity;
        }
      } else for (let t = m.tsBegin; t < logits.length; t++) logits[t] = -Infinity;
      const tok = argmax(logits);
      if (tok === m.eot) break;
      out.push(tok);
      // stop hallucination loops: the same 4 tokens three times in a row
      const n = out.length;
      if (
        n >= 12 &&
        out.slice(n - 4).join() === out.slice(n - 8, n - 4).join() &&
        out.slice(n - 8, n - 4).join() === out.slice(n - 12, n - 8).join()
      ) {
        out.length = n - 8;
        break;
      }
      ({ logits, cache } = await step(m, enc, [tok], cache));
    }
    const chunkEnd = Math.min(total, seek + CHUNK_SECONDS);
    if (job.timestamps) {
      const segs = segmentsFromTokens(out, m.idToToken, m.eot, m.tsBegin, seek, chunkEnd);
      // resume at the last finished timestamp so a sentence cut by the window isn't lost (as Whisper does);
      // the unfinished text after it is transcribed again in the next window, so drop it here
      const stamps = out.filter((t) => t >= m.tsBegin);
      const lastStamp = stamps.length >= 2 ? (stamps[stamps.length - 1] - m.tsBegin) * 0.02 : 0;
      const resume = chunkEnd < total && lastStamp >= 1;
      segments.push(...(resume ? segs.filter((g) => g.end <= seek + lastStamp + 0.01) : segs));
      seek = resume ? seek + lastStamp : chunkEnd;
    } else {
      plain.push(decodeTokens(out, m.idToToken, m.eot).trim());
      seek = chunkEnd;
    }
  }
  const text = job.timestamps ? segments.map((s) => s.text).join(" ") : plain.filter(Boolean).join(" ");
  return { text: text.replace(/\s+/g, " ").trim(), segments, language };
}

serveWorker({ transcribe: (job: TranscribeJob, progress: Progress) => transcribe(job, progress) });
