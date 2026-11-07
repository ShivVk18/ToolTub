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

/** Queue states whose job folders must survive the sweep: their upload hasn't been converted yet. */
export const PENDING_STATES = ["waiting", "active", "delayed", "prioritized", "waiting-children"];

/**
 * Job ids the sweeper must keep: the ones converting in this worker plus every job still in the queue.
 * Only `active` was kept before, so a job that waited longer than the retention (e.g. across a worker
 * restart or an outage) lost its upload and then failed. Returns null if the queue can't be read: the
 * caller then skips this sweep rather than guess which folders are safe to delete.
 * @param {ReadonlySet<string>} active
 * @param {(types: string[]) => Promise<Array<{ data?: { id?: string } }>>} getJobs
 * @returns {Promise<Set<string> | null>}
 */
export async function keepIds(active, getJobs) {
  try {
    const keep = new Set(active);
    for (const j of await getJobs(PENDING_STATES)) if (j?.data?.id) keep.add(j.data.id);
    return keep;
  } catch {
    return null;
  }
}
