/** [Own] Cron: explain an expression and list the next runs. `now` is passed in (ms). Runs use local time. */
export function cronField(f: string, min: number, max: number): Set<number> {
  const s = new Set<number>();
  for (const part of f.split(",")) {
    const [r, stStr] = part.split("/");
    const st = stStr ? +stStr : 1;
    let a: number, b: number;
    if (r === "*") {
      a = min;
      b = max;
    } else if (r.includes("-")) {
      [a, b] = r.split("-").map(Number);
    } else {
      a = +r;
      b = part.includes("/") ? max : a;
    }
    for (let i = a; i <= b; i += st) s.add(i);
  }
  return s;
}

export function cronNext(e: string, now: number, n = 5): Date[] {
  const [mi, h, dom, mon, dow] = e.trim().split(/\s+/);
  if (!dow) return [];
  const M = cronField(mi, 0, 59),
    HH = cronField(h, 0, 23),
    D = cronField(dom, 1, 31),
    MO = cronField(mon, 1, 12),
    W = cronField(dow.replace(/7/g, "0"), 0, 6);
  const out: Date[] = [];
  let t = Math.floor(now / 60000) * 60000 + 60000;
  for (let g = 0; g < 530000 && out.length < n; g++, t += 60000) {
    const d = new Date(t);
    if (!M.has(d.getMinutes()) || !HH.has(d.getHours()) || !MO.has(d.getMonth() + 1)) continue;
    const dm = dom === "*" || D.has(d.getDate()),
      dw = dow === "*" || W.has(d.getDay());
    if (dom !== "*" && dow !== "*" ? dm || dw : dm && dw) out.push(d);
  }
  return out;
}

export function cronExplain(e: string): string {
  const [mi, h, dom, mon, dow] = e.trim().split(/\s+/);
  if (!dow) return "Invalid cron expression";
  const DW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let s: string;
  const hr = /^(\d+)-(\d+)$/.exec(h);
  if (mi === "*" && h === "*") s = "Every minute";
  else if (/^\*\/\d+$/.test(mi) && h === "*") s = `Every ${mi.slice(2)} minutes`;
  else if (/^\*\/\d+$/.test(mi) && hr)
    s = `Every ${mi.slice(2)} minutes, from ${hr[1].padStart(2, "0")}:00 to ${hr[2].padStart(2, "0")}:59`;
  else if (mi === "0" && hr) s = `Every hour, from ${hr[1].padStart(2, "0")}:00 to ${hr[2].padStart(2, "0")}:00`;
  else if (/^\d+$/.test(mi) && /^\d+$/.test(h)) s = `At ${h.padStart(2, "0")}:${mi.padStart(2, "0")}`;
  else if (/^\d+$/.test(mi) && /^\*\/\d+$/.test(h)) s = `At minute ${mi}, every ${h.slice(2)} hours`;
  else if (/^\d+$/.test(mi) && h === "*") s = `At minute ${mi} of every hour`;
  else s = `Minute ${mi}, hour ${h}`;
  if (dow !== "*")
    s +=
      ", on " +
      dow
        .split(",")
        .map((x) =>
          x.includes("-")
            ? x
                .split("-")
                .map((y) => DW[+y % 7])
                .join(" to ")
            : DW[+x % 7],
        )
        .join(", ");
  if (dom !== "*") s += `, on day ${dom} of the month`;
  if (mon !== "*") s += `, in month ${mon}`;
  return s;
}
