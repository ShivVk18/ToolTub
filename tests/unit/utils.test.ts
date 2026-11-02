import { describe, expect, it } from "vitest";
import { formatBytes, renameExt } from "@/lib/utils";
import { fit } from "@/workers/image-ops";
import { mimeMatches } from "@/registry/tools";

describe("utils", () => {
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(689 * 1024)).toBe("689 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
  it("renames extensions by MIME", () => {
    expect(renameExt("holiday.photo.HEIC", "image/jpeg")).toBe("holiday.photo.jpg");
    expect(renameExt("a.png", "image/webp")).toBe("a.webp");
  });
  it("fits inside a box keeping aspect ratio and never upscales", () => {
    expect(fit(6000, 4000, 1600)).toEqual({ width: 1600, height: 1067 });
    expect(fit(1080, 1920, 1080, 1350)).toEqual({ width: 759, height: 1350 });
    expect(fit(100, 50, 1000, 1000)).toEqual({ width: 100, height: 50 });
    expect(fit(1, 1, 0.1)).toEqual({ width: 1, height: 1 });
  });
  it("matches MIME patterns", () => {
    expect(mimeMatches("image/png", "image/*")).toBe(true);
    expect(mimeMatches("application/pdf", "image/*")).toBe(false);
  });
});
