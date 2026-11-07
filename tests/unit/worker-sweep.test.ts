import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, existsSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keepIds, sweep } from "../../worker/src/sweep.mjs";

describe("worker sweeper", () => {
  it("deletes expired job folders but never one that is still converting", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kk-sweep-"));
    const old = Date.now() / 1000 - 60;
    for (const id of ["done-old", "converting-old", "fresh"]) mkdirSync(join(dir, id));
    utimesSync(join(dir, "done-old"), old, old);
    utimesSync(join(dir, "converting-old"), old, old);
    await sweep(dir, 6000, new Set(["converting-old"]), Date.now());
    expect(existsSync(join(dir, "done-old"))).toBe(false);
    expect(existsSync(join(dir, "converting-old"))).toBe(true);
    expect(existsSync(join(dir, "fresh"))).toBe(true);
  });

  it("keeps jobs still waiting in the queue, not just the one converting", async () => {
    // A queued job older than the retention lost its upload when the worker restarted, then failed.
    const getJobs = async (types: string[]) => {
      expect(types).toEqual(expect.arrayContaining(["waiting", "active", "delayed", "prioritized"]));
      return [{ data: { id: "queued-old" } }, { data: { id: "retrying" } }];
    };
    const keep = (await keepIds(new Set(["converting"]), getJobs))!;
    expect([...keep].sort()).toEqual(["converting", "queued-old", "retrying"]);

    const dir = mkdtempSync(join(tmpdir(), "kk-sweep-"));
    const old = Date.now() / 1000 - 60;
    for (const id of ["queued-old", "done-old"]) {
      mkdirSync(join(dir, id));
      utimesSync(join(dir, id), old, old);
    }
    await sweep(dir, 6000, keep, Date.now());
    expect(existsSync(join(dir, "queued-old"))).toBe(true);
    expect(existsSync(join(dir, "done-old"))).toBe(false);
  });
  it("skips the sweep when the queue can't be read (never guess which uploads are safe to delete)", async () => {
    expect(await keepIds(new Set(), async () => Promise.reject(new Error("valkey down")))).toBeNull();
  });
});
