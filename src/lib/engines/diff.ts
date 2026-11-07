/** [Own] Text diff: Myers O(ND) on lines, then on words inside changed line pairs. Pure, runs in a worker for big inputs. */

export type Op = { type: "eq" | "del" | "ins"; a?: number; b?: number };

/**
 * Shortest edit script between two token arrays (Myers 1986). The trace keeps only the 2d+3 diagonals each step
 * needs (memory O(D²), not O(D·(N+M))), and past `maxD` edits it gives up and reports a full replacement, so two
 * huge, unrelated files can't freeze the tab.
 */
export function myers<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean = (x, y) => x === y, maxD = 2000): Op[] {
  const n = a.length,
    m = b.length;
  // trim common prefix/suffix (fast path, also keeps the trace small)
  let start = 0;
  while (start < n && start < m && eq(a[start], b[start])) start++;
  let endA = n,
    endB = m;
  while (endA > start && endB > start && eq(a[endA - 1], b[endB - 1])) {
    endA--;
    endB--;
  }
  const A = a.slice(start, endA);
  const B = b.slice(start, endB);
  const N = A.length,
    M = B.length;
  const max = N + M;
  const head: Op[] = Array.from({ length: start }, (_, i) => ({ type: "eq", a: i, b: i }));
  const tail: Op[] = Array.from({ length: n - endA }, (_, i) => ({ type: "eq", a: endA + i, b: endB + i }));
  const replaceAll = (): Op[] => [
    ...head,
    ...A.map((_, i): Op => ({ type: "del", a: start + i })),
    ...B.map((_, i): Op => ({ type: "ins", b: start + i })),
    ...tail,
  ];
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = []; // trace[d] = v[max-d-1 .. max+d+1] before step d
  let found = N === 0 && M === 0;
  for (let d = 0; d <= max && !found; d++) {
    if (d > maxD) return replaceAll();
    trace.push(v.slice(max - d - 1 < 0 ? 0 : max - d - 1, max + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[max + k - 1] < v[max + k + 1]) ? v[max + k + 1] : v[max + k - 1] + 1;
      let y = x - k;
      while (x < N && y < M && eq(A[x], B[y])) {
        x++;
        y++;
      }
      v[max + k] = x;
      if (x >= N && y >= M) {
        found = true;
        break;
      }
    }
  }
  // backtrack; slice offset: index of diagonal j in trace[d] is j + d + 1 (or j + max when max-d-1 < 0)
  const at = (d: number, j: number) => trace[d][max - d - 1 < 0 ? j + max : j + d + 1];
  const mid: Op[] = [];
  let x = N,
    y = M;
  for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const k = x - y;
    const prevK = k === -d || (k !== d && at(d, k - 1) < at(d, k + 1)) ? k + 1 : k - 1;
    const prevX = at(d, prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) mid.push({ type: "eq", a: start + --x, b: start + --y });
    if (d > 0) {
      if (x === prevX) mid.push({ type: "ins", b: start + --y });
      else mid.push({ type: "del", a: start + --x });
    }
  }
  mid.reverse();
  return [...head, ...mid, ...tail];
}

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}
export interface DiffLine {
  type: "eq" | "del" | "ins" | "mod";
  a?: number; // 1-based line numbers
  b?: number;
  left?: string;
  right?: string;
  /** For "mod": word-level pieces, marked as removed/added. */
  words?: { text: string; type: "eq" | "del" | "ins" }[];
}

const norm = (s: string, o: DiffOptions) => {
  let t = o.ignoreWhitespace ? s.replace(/\s+/g, " ").trim() : s;
  if (o.ignoreCase) t = t.toLowerCase();
  return t;
};

/** Line diff where a deleted line followed by an added one becomes a "mod" with word-level changes. */
export function diffLines(
  left: string,
  right: string,
  o: DiffOptions = {},
): { lines: DiffLine[]; added: number; removed: number; changed: number } {
  const a = left.replace(/\r\n?/g, "\n").split("\n");
  const b = right.replace(/\r\n?/g, "\n").split("\n");
  const ops = myers(a, b, (x, y) => norm(x, o) === norm(y, o));
  const lines: DiffLine[] = [];
  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    if (op.type === "eq") {
      lines.push({ type: "eq", a: op.a! + 1, b: op.b! + 1, left: a[op.a!], right: b[op.b!] });
      i++;
      continue;
    }
    const dels: number[] = [];
    const ins: number[] = [];
    while (i < ops.length && ops[i].type !== "eq") {
      if (ops[i].type === "del") dels.push(ops[i].a!);
      else ins.push(ops[i].b!);
      i++;
    }
    const pairs = Math.min(dels.length, ins.length);
    for (let k = 0; k < pairs; k++)
      lines.push({
        type: "mod",
        a: dels[k] + 1,
        b: ins[k] + 1,
        left: a[dels[k]],
        right: b[ins[k]],
        words: diffWords(a[dels[k]], b[ins[k]], o),
      });
    for (let k = pairs; k < dels.length; k++) lines.push({ type: "del", a: dels[k] + 1, left: a[dels[k]] });
    for (let k = pairs; k < ins.length; k++) lines.push({ type: "ins", b: ins[k] + 1, right: b[ins[k]] });
  }
  return {
    lines,
    added: lines.filter((l) => l.type === "ins").length,
    removed: lines.filter((l) => l.type === "del").length,
    changed: lines.filter((l) => l.type === "mod").length,
  };
}

/** Word diff (words and the whitespace between them are tokens, so the text joins back exactly). */
export function diffWords(left: string, right: string, o: DiffOptions = {}) {
  const tok = (s: string) => s.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
  const a = tok(left);
  const b = tok(right);
  const ops = myers(
    a,
    b,
    (x, y) => norm(x, o) === norm(y, o) || (!!o.ignoreWhitespace && /^\s+$/.test(x) && /^\s+$/.test(y)),
  );
  const out: { text: string; type: "eq" | "del" | "ins" }[] = [];
  for (const op of ops) {
    const piece =
      op.type === "ins"
        ? { text: b[op.b!], type: "ins" as const }
        : { text: a[op.a!], type: op.type === "del" ? ("del" as const) : ("eq" as const) };
    const last = out[out.length - 1];
    if (last && last.type === piece.type) last.text += piece.text;
    else out.push(piece);
  }
  return out;
}

/** Unified diff text (like `diff -u`, 3 lines of context). */
export function unified(left: string, right: string, o: DiffOptions = {}, names = ["original", "changed"]): string {
  const { lines } = diffLines(left, right, o);
  const flat: { t: " " | "-" | "+"; s: string }[] = [];
  for (const l of lines) {
    if (l.type === "eq") flat.push({ t: " ", s: l.left! });
    else {
      if (l.left !== undefined) flat.push({ t: "-", s: l.left });
      if (l.right !== undefined) flat.push({ t: "+", s: l.right });
    }
  }
  if (!flat.some((f) => f.t !== " ")) return "";
  const out = [`--- ${names[0]}`, `+++ ${names[1]}`];
  let i = 0;
  while (i < flat.length) {
    if (flat[i].t === " ") {
      i++;
      continue;
    }
    const s = Math.max(0, i - 3);
    let e = i;
    while (e < flat.length) {
      if (flat[e].t !== " ") e++;
      else {
        let run = 0;
        while (e + run < flat.length && flat[e + run].t === " ") run++;
        if (run > 6 || e + run >= flat.length) {
          e = Math.min(flat.length, e + 3);
          break;
        }
        e += run;
      }
    }
    const hunk = flat.slice(s, e);
    const aStart = flat.slice(0, s).filter((f) => f.t !== "+").length + 1;
    const bStart = flat.slice(0, s).filter((f) => f.t !== "-").length + 1;
    out.push(
      `@@ -${aStart},${hunk.filter((f) => f.t !== "+").length} +${bStart},${hunk.filter((f) => f.t !== "-").length} @@`,
    );
    for (const f of hunk) out.push(f.t + f.s);
    i = e;
  }
  return out.join("\n") + "\n";
}
