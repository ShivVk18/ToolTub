/** Time zone conversion with Intl (IANA zones, DST-aware). Pure apart from Intl. */

/** Common abbreviations → IANA zone. Ambiguous ones pick the most common meaning (IST = India). */
export const ZONE_ALIASES: Record<string, string> = {
  utc: "UTC",
  gmt: "UTC",
  z: "UTC",
  ist: "Asia/Kolkata",
  india: "Asia/Kolkata",
  pst: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  pt: "America/Los_Angeles",
  mst: "America/Denver",
  mdt: "America/Denver",
  cst: "America/Chicago",
  cdt: "America/Chicago",
  est: "America/New_York",
  edt: "America/New_York",
  et: "America/New_York",
  bst: "Europe/London",
  uk: "Europe/London",
  cet: "Europe/Paris",
  cest: "Europe/Paris",
  jst: "Asia/Tokyo",
  sgt: "Asia/Singapore",
  aest: "Australia/Sydney",
  aedt: "Australia/Sydney",
  gst: "Asia/Dubai",
  "new york": "America/New_York",
  nyc: "America/New_York",
  "san francisco": "America/Los_Angeles",
  "los angeles": "America/Los_Angeles",
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  dubai: "Asia/Dubai",
  mumbai: "Asia/Kolkata",
  delhi: "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  bengaluru: "Asia/Kolkata",
  singapore: "Asia/Singapore",
  tokyo: "Asia/Tokyo",
  sydney: "Australia/Sydney",
  chicago: "America/Chicago",
  denver: "America/Denver",
  toronto: "America/Toronto",
  "sao paulo": "America/Sao_Paulo",
  "hong kong": "Asia/Hong_Kong",
  shanghai: "Asia/Shanghai",
  beijing: "Asia/Shanghai",
};

export const DEFAULT_ZONES = [
  "UTC",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function resolveZone(name: string): string {
  const k = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (ZONE_ALIASES[k]) return ZONE_ALIASES[k];
  const iana = name.trim().replace(/ /g, "_");
  try {
    new Intl.DateTimeFormat("en", { timeZone: iana });
    return iana;
  } catch {
    throw new Error(`Unknown time zone: ${name.trim()}`);
  }
}

/** Offset of `zone` from UTC at instant `ts`, in minutes (IST → 330). */
export function zoneOffset(zone: string, ts: number): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(ts))
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(ts / 1000) * 1000) / 60000);
}

/** The instant when the wall clock in `zone` reads y-m-d h:mi. DST gaps move forward; overlaps pick the first. */
export function wallToInstant(zone: string, y: number, mo: number, d: number, h: number, mi: number): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let ts = guess - zoneOffset(zone, guess) * 60000;
  ts = guess - zoneOffset(zone, ts) * 60000;
  return ts;
}

export interface TzResult {
  instant: number;
  from: string;
  rows: { zone: string; time: string; date: string; offset: string; dayShift: number }[];
}

const fmtOffset = (min: number) =>
  `UTC${min >= 0 ? "+" : "−"}${String(Math.floor(Math.abs(min) / 60)).padStart(2, "0")}:${String(Math.abs(min) % 60).padStart(2, "0")}`;

/**
 * "10:30 IST to PST", "6pm London", "2026-11-04 18:00 Europe/London in Tokyo, NYC", "now in tokyo".
 * Without a target, shows the default world clock. `now` is passed in so results are testable.
 */
export function parseTimeZone(input: string, now: number): TzResult {
  const s = input.trim();
  if (!s) throw new Error('Try "10:30 IST to PST" or "now in Tokyo"');
  const [left, right] = s.split(/\s+(?:to|in|into|→|->)\s+/i);
  let rest = left.trim();
  let y: number | undefined, mo: number | undefined, d: number | undefined;
  let h: number | undefined,
    mi = 0;
  let instant: number | undefined;
  let from = "UTC";

  const dm = /^(\d{4})-(\d{2})-(\d{2})[ T]?/.exec(rest);
  if (dm) {
    [y, mo, d] = [+dm[1], +dm[2], +dm[3]];
    rest = rest.slice(dm[0].length).trim();
  }
  if (/^now\b/i.test(rest)) {
    instant = now;
    rest = rest.slice(3).trim();
  } else {
    const tm = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i.exec(rest);
    if (!tm || (!tm[2] && !tm[3] && !dm)) throw new Error("Couldn't read the time. Use 10:30, 6pm or 18:00");
    h = +tm[1];
    mi = tm[2] ? +tm[2] : 0;
    const ap = tm[3]?.toLowerCase().replace(/\./g, "");
    if (ap) {
      if (h < 1 || h > 12) throw new Error("With am/pm the hour must be 1–12");
      h = (h % 12) + (ap === "pm" ? 12 : 0);
    }
    if (h > 23 || mi > 59) throw new Error("That's not a valid time");
    rest = rest.slice(tm[0].length).trim();
  }
  if (rest) from = resolveZone(rest);
  else if (instant === undefined) from = "UTC";

  if (instant === undefined) {
    if (y === undefined) {
      const p = new Intl.DateTimeFormat("en-CA", {
        timeZone: from,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(now));
      [y, mo, d] = p.split("-").map(Number);
    }
    if (mo! < 1 || mo! > 12 || d! < 1 || d! > 31) throw new Error("That's not a valid date");
    instant = wallToInstant(from, y!, mo!, d!, h ?? 0, mi);
  }

  const zones = right
    ? right
        .split(/\s*(?:,|\band\b)\s*/i)
        .filter(Boolean)
        .map(resolveZone)
    : DEFAULT_ZONES.filter((z) => z !== from);
  const dayOf = (z: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: z, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(instant!),
    );
  const baseDay = dayOf(from);
  const rows = [from, ...zones].map((zone) => {
    const day = dayOf(zone);
    return {
      zone,
      time: new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(instant!)),
      date: new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(new Date(instant!)),
      offset: fmtOffset(zoneOffset(zone, instant!)),
      dayShift: Math.round((Date.parse(day) - Date.parse(baseDay)) / 86400000),
    };
  });
  return { instant, from, rows };
}
