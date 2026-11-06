// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  delete document.documentElement.dataset.theme;
  vi.resetModules();
});

describe("theme (one storage key)", () => {
  it("setTheme writes only 'theme' and removes the legacy key", async () => {
    const { setTheme } = await import("@/lib/theme");
    localStorage.setItem("kk.theme", '"light"');
    setTheme("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(localStorage.getItem("kk.theme")).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
  it("readTheme falls back to the legacy JSON key", async () => {
    const { readTheme } = await import("@/lib/theme");
    localStorage.setItem("kk.theme", '"dark"');
    expect(readTheme()).toBe("dark");
  });
  it("themeScript applies the stored theme before paint", async () => {
    const { themeScript } = await import("@/lib/theme");
    window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
    localStorage.setItem("theme", "dark");
    new Function(themeScript)();
    expect(document.documentElement.dataset.theme).toBe("dark");
    localStorage.setItem("theme", "light");
    new Function(themeScript)();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
  it("survives blocked storage", async () => {
    const { readTheme, setTheme } = await import("@/lib/theme");
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    expect(readTheme()).toBe("dark");
    expect(() => setTheme("light")).not.toThrow();
    spy.mockRestore();
  });
});

describe("recent files (persisted store)", () => {
  it("dedupes, puts the newest first and keeps 5", async () => {
    const { useKlip } = await import("@/lib/store/klip");
    const add = useKlip.getState().addRecentFile;
    ["a.pdf", "b.pdf", "c.pdf", "a.pdf", "d.pdf", "e.pdf", "f.pdf"].forEach(add);
    expect(useKlip.getState().recentFiles).toEqual(["f.pdf", "e.pdf", "d.pdf", "a.pdf", "c.pdf"]);
    expect(JSON.parse(localStorage.getItem("klipkit")!).state.recentFiles).toHaveLength(5);
  });
  it("folds in the legacy 'kk.recents' key once", async () => {
    localStorage.setItem("kk.recents", JSON.stringify(["old.pdf", "older.jpg"]));
    const { useKlip } = await import("@/lib/store/klip");
    expect(useKlip.getState().recentFiles).toEqual(["old.pdf", "older.jpg"]);
    expect(localStorage.getItem("kk.recents")).toBeNull();
  });
});
