import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, existsSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sweep } from "../../worker/src/sweep.mjs";

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
});
