/** [Own] Timestamps: relative time and conversions. `now` is passed in (ms) so results are deterministic. */
/** Relative time of `ms` as seen from `now` (both epoch ms), e.g. "in 3 days". */
export function rel(ms: number, now: number): string {
  const d = (ms - now) / 1000;
  const a = Math.abs(d);
  const rtf =
    typeof Intl !== "undefined" && Intl.RelativeTimeFormat
      ? new Intl.RelativeTimeFormat("en", { numeric: "auto" })
      : null;
  const U: [number, Intl.RelativeTimeFormatUnit, number][] = [
    [60, "second", 1],
    [3600, "minute", 60],
    [86400, "hour", 3600],
    [2592000, "day", 86400],
    [31536000, "month", 2592000],
    [Infinity, "year", 31536000],
  ];
  for (const [lim, u, div] of U) {
    if (a < lim) {
      return rtf ? rtf.format(Math.round(d / div), u) : `${Math.round(a / div)} ${u}s`;
    }
  }
  return "recently";
}

export function tsConv(t: string, now: number): [string, string][] | null {
  const n = +t.trim();
  if (isNaN(n)) return null;
  const ms = t.trim().length >= 13 ? n : n * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return [
    ["India (IST)", d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "long" })],
    ["UTC", d.toUTCString()],
    ["ISO 8601", d.toISOString()],
    ["Relative", rel(ms, now)],
    ["Seconds", String(Math.floor(ms / 1000))],
    ["Milliseconds", String(ms)],
  ];
}
