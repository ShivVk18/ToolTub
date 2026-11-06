import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Delete every job folder in `dir` older than `retentionMs` (by mtime) — except jobs still converting.
 * Without the `active` check, a conversion that ran longer than the retention time lost its folder mid-run.
 * @param {string} dir
 * @param {number} retentionMs
 * @param {ReadonlySet<string>} active job ids currently being converted
 * @param {number} now epoch ms
 */
export async function sweep(dir, retentionMs, active, now) {
  for (const name of await readdir(dir).catch(() => [])) {
    if (active.has(name)) continue;
    const p = join(dir, name);
    const s = await stat(p).catch(() => null);
    if (s && now - s.mtimeMs > retentionMs) await rm(p, { recursive: true, force: true });
  }
}
