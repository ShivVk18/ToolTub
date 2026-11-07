/** Barcodes: Code 128 (B and C), EAN-13 and UPC-A, as bar widths and SVG. Pure, no DOM. */

// Code 128 patterns: bar/space widths for values 0–106 (106 = stop, 7 elements).
const C128 = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
];

export interface Barcode {
  /** Alternating bar/space module widths, starting with a bar. */
  widths: number[];
  text: string;
  kind: "Code 128" | "EAN-13" | "UPC-A";
}

/** Code 128: set C for runs of 4+ digits (denser), set B for the rest. ASCII 32–126 only. */
export function code128(s: string): Barcode {
  if (!s) throw new Error("Type something to encode");
  if (s.length > 80) throw new Error("Code 128 is practical up to 80 characters");
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 32 || c > 126) throw new Error(`Code 128 can't encode "${ch}" (ASCII letters, digits and symbols only)`);
  }
  const codes: number[] = [];
  let set: "B" | "C" | null = null;
  const toB = () => {
    if (set !== "B") codes.push(set === null ? 104 : 100);
    set = "B";
  };
  const digitRun = (k: number) => {
    let n = 0;
    while (k + n < s.length && s[k + n] >= "0" && s[k + n] <= "9") n++;
    return n;
  };
  let i = 0;
  while (i < s.length) {
    let run = digitRun(i);
    if (set === "C" && run >= 2) {
      const n = run - (run % 2);
      for (let k = 0; k < n; k += 2) codes.push(+s.slice(i + k, i + k + 2));
      i += n;
      continue;
    }
    // Set C pays off for 4+ digits at the start or end, or 6+ in the middle.
    if (run >= 4 && (set === null || i + run === s.length || run >= 6)) {
      if (run % 2) {
        toB();
        codes.push(s.charCodeAt(i) - 32);
        i++;
        run--;
      }
      codes.push(set === null ? 105 : 99);
      set = "C";
      continue;
    }
    toB();
    codes.push(s.charCodeAt(i) - 32);
    i++;
  }
  let sum = codes[0];
  for (let k = 1; k < codes.length; k++) sum += codes[k] * k;
  codes.push(sum % 103, 106);
  const widths = codes.flatMap((c) => [...C128[c]].map(Number));
  return { widths, text: s, kind: "Code 128" };
}

// EAN/UPC digit patterns (L = odd parity left, G = even parity left, R = right).
const L = ["3211", "2221", "2122", "1411", "1132", "1231", "1114", "1312", "1213", "3112"];
const G = ["1123", "1222", "2212", "1141", "2311", "1321", "4111", "2131", "3121", "2113"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function eanCheck(d12: string): number {
  let s = 0;
  for (let i = 0; i < 12; i++) s += +d12[i] * (i % 2 ? 3 : 1);
  return (10 - (s % 10)) % 10;
}

/** EAN-13 from 12 digits (check digit added) or 13 digits (check digit verified). */
export function ean13(input: string): Barcode {
  const d = input.replace(/[\s-]/g, "");
  if (!/^\d{12,13}$/.test(d)) throw new Error("EAN-13 needs 12 digits (or 13 with the check digit)");
  const c = eanCheck(d.slice(0, 12));
  if (d.length === 13 && +d[12] !== c) throw new Error(`Wrong check digit: expected ${c}, got ${d[12]}`);
  const full = d.slice(0, 12) + c;
  const par = PARITY[+full[0]];
  const w: number[] = [1, 1, 1];
  for (let i = 1; i <= 6; i++) w.push(...[...(par[i - 1] === "L" ? L : G)[+full[i]]].map(Number));
  w.push(1, 1, 1, 1, 1);
  for (let i = 7; i <= 12; i++) w.push(...[...L[+full[i]]].map(Number));
  w.push(1, 1, 1);
  // Guards and digits alternate bar/space: left digits start with a space, right digits with a bar.
  return { widths: w, text: full, kind: "EAN-13" };
}

/** UPC-A = EAN-13 with a leading 0. Takes 11 digits (check added) or 12 (verified). */
export function upcA(input: string): Barcode {
  const d = input.replace(/[\s-]/g, "");
  if (!/^\d{11,12}$/.test(d)) throw new Error("UPC-A needs 11 digits (or 12 with the check digit)");
  const c = eanCheck("0" + d.slice(0, 11));
  if (d.length === 12 && +d[11] !== c) throw new Error(`Wrong check digit: expected ${c}, got ${d[11]}`);
  const b = ean13("0" + d.slice(0, 11) + c);
  return { ...b, text: d.slice(0, 11) + c, kind: "UPC-A" };
}

/** SVG with a quiet zone and the human-readable text. Module width 2 px, height 80 px. */
export function barcodeSvg(b: Barcode, color = "#000", bg = "#fff"): string {
  const m = 2;
  const quiet = 10 * m;
  const total = b.widths.reduce((a, x) => a + x, 0) * m + quiet * 2;
  let x = quiet;
  let rects = "";
  b.widths.forEach((w, i) => {
    if (i % 2 === 0) rects += `<rect x="${x}" y="10" width="${w * m}" height="80"/>`;
    x += w * m;
  });
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="116" viewBox="0 0 ${total} 116" role="img" aria-label="${b.kind} ${esc(b.text)}"><rect width="100%" height="100%" fill="${bg}"/><g fill="${color}">${rects}</g><text x="${total / 2}" y="108" font-family="monospace" font-size="14" text-anchor="middle" fill="${color}">${esc(b.text)}</text></svg>`;
}
