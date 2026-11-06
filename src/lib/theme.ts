/**
 * Theme: one storage key ("theme" = "light" | "dark"). The inline `themeScript` applies it before first paint.
 * Older builds also wrote "kk.theme" (JSON string); it's read once as a fallback and then removed.
 */
export type Theme = "light" | "dark";
export const THEME_KEY = "theme";
const LEGACY_KEY = "kk.theme";

const parse = (v: string | null): Theme | null =>
  v === "dark" || v === '"dark"' ? "dark" : v === "light" || v === '"light"' ? "light" : null;

/** Stored theme, else the system preference. Safe when storage is blocked. */
export function readTheme(): Theme {
  try {
    const t = parse(localStorage.getItem(THEME_KEY)) ?? parse(localStorage.getItem(LEGACY_KEY));
    if (t) return t;
  } catch {}
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Apply to <html> and persist. `animate` adds the short cross-fade class used by the toggle. */
export function setTheme(t: Theme, { animate = false } = {}) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theming");
    setTimeout(() => root.classList.remove("theming"), 800);
  }
  root.dataset.theme = t;
  root.classList.toggle("dark", t === "dark");
  try {
    localStorage.setItem(THEME_KEY, t);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

/** Inline, render-blocking script for <head>: sets data-theme and the "dark" class before first paint. */
export const themeScript = `try{var p=function(v){return v==="dark"||v==='"dark"'?"dark":v==="light"||v==='"light"'?"light":null};var t=p(localStorage.getItem("${THEME_KEY}"))||p(localStorage.getItem("${LEGACY_KEY}"));if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}`;
