/**
 * [Model] Background removal on the user's device.
 * Runtime: onnxruntime-web (MIT), served from /vendor/ort. Model: ISNet general-use (Apache-2.0),
 * served from /models (see public/models/README.md). WebGPU when available, WASM otherwise.
 * Pre/post-processing follows ISNet's reference: 1024×1024 input, mean 0.5, std 1.0, min-max normalised mask.
 */
import { serveWorker, type Progress } from "@/lib/worker-rpc";

const MODEL_URL = "/models/isnet-general-use-int8.onnx";
const SIZE = 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let session: any = null;
let backend = "wasm";

async function fetchWithProgress(url: string, progress: Progress) {
  const cache = await caches.open("klipkit-models-v1");
  const hit = await cache.match(url);
  if (hit) return new Uint8Array(await hit.arrayBuffer());
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error("Couldn't download the AI model. Check your connection and try again.");
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    progress({ ratio: total ? got / total : undefined, label: `Downloading AI model (one time) ${Math.round(got / 1e6)} MB` });
  }
  const bytes = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { bytes.set(c, o); o += c.length; }
  await cache.put(url, new Response(bytes));
  return bytes;
}

async function getSession(progress: Progress) {
  if (session) return session;
  const ortUrl = "/vendor/ort/ort.webgpu.bundle.min.mjs";
  const ort = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ ortUrl);
  ort.env.wasm.wasmPaths = "/vendor/ort/";
  const model = await fetchWithProgress(MODEL_URL, progress);
  progress({ label: "Starting AI model" });
  const hasGpu = "gpu" in navigator && !!(await (navigator as Navigator & { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter().catch(() => null));
  backend = hasGpu ? "webgpu" : "wasm";
  session = await ort.InferenceSession.create(model, { executionProviders: hasGpu ? ["webgpu", "wasm"] : ["wasm"] });
  return Object.assign(session, { ort });
}

async function remove({ blob }: { blob: Blob }, progress: Progress) {
  const s = await getSession(progress);
  const ort = s.ort;
  progress({ label: "Removing background" });
  const src = await createImageBitmap(blob, { imageOrientation: "from-image" });

  // Preprocess: resize to 1024², CHW float32, (x/255 - 0.5) / 1.0
  const c = new OffscreenCanvas(SIZE, SIZE);
  const cx = c.getContext("2d")!;
  cx.drawImage(src, 0, 0, SIZE, SIZE);
  const px = cx.getImageData(0, 0, SIZE, SIZE).data;
  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0, p = 0; i < SIZE * SIZE; i++, p += 4) {
    input[i] = px[p] / 255 - 0.5;
    input[i + SIZE * SIZE] = px[p + 1] / 255 - 0.5;
    input[i + 2 * SIZE * SIZE] = px[p + 2] / 255 - 0.5;
  }
  const feeds = { [s.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) };
  const out = await s.run(feeds);
  const mask = out[s.outputNames[0]].data as Float32Array;

  // Min-max normalise to 0–255 alpha.
  let mn = Infinity, mx = -Infinity;
  for (const v of mask) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const alpha = new ImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const a = ((mask[i] - mn) / (mx - mn || 1)) * 255;
    alpha.data[i * 4 + 3] = a;
  }

  // Scale mask to the original size and apply it with destination-in compositing.
  const maskCanvas = new OffscreenCanvas(SIZE, SIZE);
  maskCanvas.getContext("2d")!.putImageData(alpha, 0, 0);
  const outCanvas = new OffscreenCanvas(src.width, src.height);
  const ox = outCanvas.getContext("2d")!;
  ox.drawImage(src, 0, 0);
  ox.globalCompositeOperation = "destination-in";
  ox.imageSmoothingQuality = "high";
  ox.drawImage(maskCanvas, 0, 0, src.width, src.height);
  const png = await outCanvas.convertToBlob({ type: "image/png" });
  return { blob: png, width: src.width, height: src.height, backend };
}

serveWorker({ remove });
