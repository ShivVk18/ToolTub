/** [Own] Colour parsing (hex, rgb, hsl) with WCAG contrast ratios. Pure. */
export interface ColorResult {
  hex: string;
  rgb: string;
  hsl: string;
  cw: number;
  cb: number;
  a: number;
}

export function parseColor(s: string): ColorResult | null {
  const str = s.trim();
  let r = 0,
    g = 0,
    b = 0,
    a = 1;
  let m = /^#([0-9a-f]{3,8})$/i.exec(str);
  if (m) {
    let h = m[1];
    if (h.length === 3)
      h = h
        .split("")
        .map((x) => x + x)
        .join("");
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
    if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
  } else if ((m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s\/]+([\d.]+))?/i.exec(str))) {
    [r, g, b] = [+m[1], +m[2], +m[3]];
    if (m[4]) a = +m[4];
  } else if ((m = /^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i.exec(str))) {
    const H = +m[1] / 360,
      S = +m[2] / 100,
      L = +m[3] / 100;
    const f = (n: number) => {
      const k = (n + H * 12) % 12;
      const aa = S * Math.min(L, 1 - L);
      return Math.round(255 * (L - aa * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    [r, g, b] = [f(0), f(8), f(4)];
  } else {
    return null;
  }
  const R = r / 255,
    G = g / 255,
    B = b / 255,
    mx = Math.max(R, G, B),
    mn = Math.min(R, G, B),
    l = (mx + mn) / 2;
  let h = 0,
    sat = 0;
  if (mx !== mn) {
    const d = mx - mn;
    sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h /= 6;
  }
  const lum = (x: number) => {
    x /= 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const Y = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
  return {
    hex:
      "#" +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase(),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${Math.round(h * 360)}, ${Math.round(sat * 100)}%, ${Math.round(l * 100)}%)`,
    cw: 1.05 / (Y + 0.05),
    cb: (Y + 0.05) / 0.05,
    a,
  };
}
