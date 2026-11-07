/** Unit conversion: "5 km to mi", "100 f in c", "1.5 GB", "3 lb". Pure, no DOM. */

type Kind = "length" | "mass" | "temperature" | "volume" | "data" | "time" | "speed" | "area";
interface Unit {
  k: Kind;
  /** Factor to the kind's base unit (m, kg, L, byte, s, m/s, m²). Temperature uses `to`/`from`. */
  f: number;
  name: string;
}

const U: Record<string, Unit> = {};
const add = (k: Kind, f: number, name: string, ...aliases: string[]) => {
  for (const a of [name, ...aliases]) U[a.toLowerCase()] = { k, f, name };
};

add("length", 1e-3, "mm", "millimeter", "millimeters", "millimetre", "millimetres");
add("length", 1e-2, "cm", "centimeter", "centimeters", "centimetre", "centimetres");
add("length", 1, "m", "meter", "meters", "metre", "metres");
add("length", 1e3, "km", "kilometer", "kilometers", "kilometre", "kilometres");
add("length", 0.0254, "in", "inch", "inches", '"');
add("length", 0.3048, "ft", "foot", "feet", "'");
add("length", 0.9144, "yd", "yard", "yards");
add("length", 1609.344, "mi", "mile", "miles");
add("length", 1852, "nmi", "nautical mile", "nautical miles");

add("mass", 1e-6, "mg", "milligram", "milligrams");
add("mass", 1e-3, "g", "gram", "grams");
add("mass", 1, "kg", "kilogram", "kilograms", "kilo", "kilos");
add("mass", 1000, "t", "tonne", "tonnes", "ton", "tons");
add("mass", 0.028349523125, "oz", "ounce", "ounces");
add("mass", 0.45359237, "lb", "lbs", "pound", "pounds");
add("mass", 6.35029318, "st", "stone", "stones");

add("temperature", 1, "°C", "c", "celsius", "degc", "°c");
add("temperature", 1, "°F", "f", "fahrenheit", "degf", "°f");
add("temperature", 1, "K", "k", "kelvin", "kelvins");

add("volume", 1e-3, "ml", "milliliter", "milliliters", "millilitre", "millilitres");
add("volume", 1, "l", "liter", "liters", "litre", "litres");
add("volume", 3.785411784, "gal", "gallon", "gallons", "us gal");
add("volume", 0.946352946, "qt", "quart", "quarts");
add("volume", 0.473176473, "pt", "pint", "pints");
add("volume", 0.2365882365, "cup", "cups");
add("volume", 0.0295735295625, "fl oz", "floz", "fluid ounce", "fluid ounces");
add("volume", 0.01478676478125, "tbsp", "tablespoon", "tablespoons");
add("volume", 0.00492892159375, "tsp", "teaspoon", "teaspoons");

add("data", 1 / 8, "bit", "bits");
add("data", 1, "B", "b", "byte", "bytes");
add("data", 1e3, "KB", "kb", "kilobyte", "kilobytes");
add("data", 1e6, "MB", "mb", "megabyte", "megabytes");
add("data", 1e9, "GB", "gb", "gigabyte", "gigabytes");
add("data", 1e12, "TB", "tb", "terabyte", "terabytes");
add("data", 1024, "KiB", "kib", "kibibyte", "kibibytes");
add("data", 1024 ** 2, "MiB", "mib", "mebibyte", "mebibytes");
add("data", 1024 ** 3, "GiB", "gib", "gibibyte", "gibibytes");

add("time", 1e-3, "ms", "millisecond", "milliseconds");
add("time", 1, "s", "sec", "secs", "second", "seconds");
add("time", 60, "min", "mins", "minute", "minutes");
add("time", 3600, "h", "hr", "hrs", "hour", "hours");
add("time", 86400, "d", "day", "days");
add("time", 604800, "wk", "week", "weeks");
add("time", 31557600, "yr", "year", "years");

add("speed", 1, "m/s", "mps");
add("speed", 1000 / 3600, "km/h", "kmh", "kph", "kmph");
add("speed", 0.44704, "mph");
add("speed", 1852 / 3600, "kn", "knot", "knots");

add("area", 1e-4, "cm²", "cm2", "sq cm");
add("area", 1, "m²", "m2", "sq m", "sqm");
add("area", 1e6, "km²", "km2", "sq km");
add("area", 0.09290304, "ft²", "ft2", "sq ft", "sqft");
add("area", 4046.8564224, "acre", "acres", "ac");
add("area", 1e4, "ha", "hectare", "hectares");

/** Units shown when no target is given, per kind. */
const DEFAULTS: Record<Kind, string[]> = {
  length: ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"],
  mass: ["g", "kg", "t", "oz", "lb", "st"],
  temperature: ["°C", "°F", "K"],
  volume: ["ml", "l", "tsp", "tbsp", "cup", "fl oz", "pt", "gal"],
  data: ["bit", "B", "KB", "MB", "GB", "TB", "KiB", "MiB", "GiB"],
  time: ["ms", "s", "min", "h", "d", "wk", "yr"],
  speed: ["m/s", "km/h", "mph", "kn"],
  area: ["cm²", "m²", "km²", "ft²", "acre", "ha"],
};

const toKelvin = (v: number, u: string) => (u === "°C" ? v + 273.15 : u === "°F" ? ((v - 32) * 5) / 9 + 273.15 : v);
const fromKelvin = (k: number, u: string) => (u === "°C" ? k - 273.15 : u === "°F" ? ((k - 273.15) * 9) / 5 + 32 : k);

export function convert(value: number, from: string, to: string): number {
  const a = U[from.toLowerCase()];
  const b = U[to.toLowerCase()];
  if (!a || !b) throw new Error(`Unknown unit: ${!a ? from : to}`);
  if (a.k !== b.k) throw new Error(`Can't convert ${a.k} (${a.name}) to ${b.k} (${b.name})`);
  if (a.k === "temperature") {
    const k = toKelvin(value, a.name);
    if (k < -1e-9) throw new Error("Below absolute zero");
    return fromKelvin(k, b.name);
  }
  return (value * a.f) / b.f;
}

/** Up to 10 significant digits, no trailing zeros, no exponent for everyday sizes. */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e15 || abs < 1e-6) return n.toExponential(6).replace(/\.?0+e/, "e");
  return String(+n.toPrecision(10));
}

export interface UnitResult {
  value: number;
  from: string;
  kind: Kind;
  rows: [unit: string, value: number][];
}

/**
 * Parse "<number> <unit> [to|in|as|→ <unit>]". Accepts "1,000", "1_000", "-40", "2.5e3", "5km", "100°F".
 * Without a target, converts to every common unit of the same kind.
 */
export function parseConversion(input: string): UnitResult {
  const s = input.trim().replace(/(\d)[,_](?=\d{3}\b)/g, "$1");
  const m = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(.+?)(?:\s+(?:to|in|as|into)\s+|\s*(?:->|→|=)\s*)(.+)$/i.exec(
    s,
  );
  const m2 = m ? null : /^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(.+)$/i.exec(s);
  if (!m && !m2) throw new Error('Try "5 km to mi", "100 f in c" or "1.5 GB"');
  const value = Number((m ?? m2)![1]);
  const fromRaw = (m ?? m2)![2].trim();
  const a = U[fromRaw.toLowerCase()];
  if (!a) throw new Error(`Unknown unit: ${fromRaw}`);
  const targets = m
    ? m[3]
        .split(/\s*(?:,|and)\s*/i)
        .map((t) => t.trim())
        .filter(Boolean)
    : DEFAULTS[a.k].filter((u) => u !== a.name);
  const rows = targets.map((t) => [U[t.toLowerCase()]?.name ?? t, convert(value, fromRaw, t)] as [string, number]);
  return { value, from: a.name, kind: a.k, rows };
}
