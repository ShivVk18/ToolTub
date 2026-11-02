/**
 * Web Worker pattern used by every heavy tool:
 *   - the worker module exports nothing; it listens for { id, op, args } and replies { id, ok, result | error }
 *   - progress messages { id, progress } stream back for long jobs (model downloads, batches)
 *   - Transferables (ArrayBuffer, ImageBitmap) are passed without copying
 * The worker is created lazily on first use, so its code and libraries never load on page view.
 */
export type Progress = (p: { ratio?: number; label?: string }) => void;

export function createWorkerClient<Ops extends Record<string, (...a: never[]) => unknown>>(factory: () => Worker) {
  let worker: Worker | null = null;
  let seq = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; onProgress?: Progress }>();

  const get = () => {
    if (worker) return worker;
    worker = factory();
    worker.onmessage = (e: MessageEvent) => {
      const { id, ok, result, error, progress } = e.data;
      const p = pending.get(id);
      if (!p) return;
      if (progress) return p.onProgress?.(progress);
      pending.delete(id);
      if (ok) p.resolve(result);
      else p.reject(new Error(error));
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || "Worker crashed"));
      pending.clear();
      worker = null;
    };
    return worker;
  };

  return {
    call<K extends keyof Ops & string>(
      op: K,
      args: Parameters<Ops[K]>[0],
      opts: { transfer?: Transferable[]; onProgress?: Progress } = {},
    ): Promise<Awaited<ReturnType<Ops[K]>>> {
      const id = ++seq;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress: opts.onProgress });
        get().postMessage({ id, op, args }, opts.transfer ?? []);
      });
    },
    terminate() {
      worker?.terminate();
      worker = null;
    },
  };
}

/** Worker-side helper: wires a table of async ops to the message protocol. */
export function serveWorker(ops: Record<string, (args: never, progress: Progress) => unknown>) {
  self.onmessage = async (e: MessageEvent) => {
    const { id, op, args } = e.data;
    const progress: Progress = (p) => self.postMessage({ id, progress: p });
    try {
      const fn = ops[op];
      if (!fn) throw new Error(`Unknown op ${op}`);
      const result = await fn(args as never, progress);
      self.postMessage({ id, ok: true, result });
    } catch (err) {
      self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  };
}
