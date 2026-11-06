import type { FileKind } from "./engines/intent";
export type { FileKind };

export interface FileKindConfig {
  c: string;
  l: string;
}

export const KINDS: Record<FileKind, FileKindConfig> = {
  pdf: { c: "#E5484D", l: "PDF" },
  image: { c: "#1F9D63", l: "IMG" },
  audio: { c: "#D98E04", l: "MP3" },
  video: { c: "#2F80ED", l: "MP4" },
  data: { c: "#3B3943", l: "JSON" },
  doc: { c: "#2B5FD9", l: "DOC" },
  other: { c: "#7C7870", l: "FILE" },
};

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  kind: FileKind;
  file?: File;
  url?: string;
  w?: number;
  h?: number;
  pages?: number;
  dur?: number;
  lines?: number;
  text?: string;
  sample?: number;
  multi?: FileInfo[];
  realSize?: number;
}

export function kindOf(name: string, type: string = ""): FileKind {
  const e = (name.split(".").pop() || "").toLowerCase();
  if (e === "pdf" || type === "application/pdf") return "pdf";
  if (/^image\//.test(type) || ["jpg", "jpeg", "png", "webp", "heic", "heif", "avif", "gif", "bmp", "svg"].includes(e))
    return "image";
  if (/^audio\//.test(type) || ["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(e)) return "audio";
  if (/^video\//.test(type) || ["mp4", "mov", "webm", "mkv", "avi"].includes(e)) return "video";
  if (["json", "csv", "yaml", "yml", "xml", "sql", "txt", "md", "js", "ts", "html", "css"].includes(e)) return "data";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt"].includes(e)) return "doc";
  return "other";
}

export const fmtSize = (b: number): string => {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
  return Math.max(1, Math.round(b / 1e3)) + " KB";
};

export const fmtDur = (s: number): string => {
  const rounded = Math.round(s);
  return rounded >= 60
    ? Math.floor(rounded / 60) + ":" + String(rounded % 60).padStart(2, "0")
    : "0:" + String(rounded).padStart(2, "0");
};

export function describe(f: FileInfo): string {
  const sz = fmtSize(f.size);
  switch (f.kind) {
    case "pdf":
      return f.pages ? `a ${f.pages}-page PDF, ${sz}` : `a PDF, ${sz}`;
    case "image":
      return f.w && f.h ? `a ${f.w} × ${f.h} photo, ${sz}` : `an image, ${sz}`;
    case "audio":
      return f.dur ? `a ${fmtDur(f.dur)} audio file, ${sz}` : `an audio file, ${sz}`;
    case "video":
      return f.dur ? `a ${fmtDur(f.dur)} video, ${sz}` : `a video, ${sz}`;
    case "data": {
      const ext = (f.name.split(".").pop() || "DATA").toUpperCase();
      return f.lines ? `a ${ext} file with ${f.lines.toLocaleString()} lines` : `a data file, ${sz}`;
    }
    case "doc":
      return `an Office document, ${sz}`;
    default:
      return `a file, ${sz}`;
  }
}

export function meta(f: FileInfo): string {
  const sz = fmtSize(f.size);
  if (f.kind === "pdf" && f.pages) return `${f.pages} pages · ${sz}`;
  if (f.kind === "image" && f.w && f.h) return `${f.w} × ${f.h} · ${sz}`;
  if ((f.kind === "audio" || f.kind === "video") && f.dur) return `${fmtDur(f.dur)} · ${sz}`;
  if (f.kind === "data" && f.lines) return `${f.lines.toLocaleString()} lines · ${sz}`;
  return sz;
}

export async function fromFile(file: File): Promise<FileInfo> {
  const f: FileInfo = {
    name: file.name,
    size: file.size,
    type: file.type,
    kind: kindOf(file.name, file.type),
    file,
  };
  try {
    if (typeof window !== "undefined") {
      if (f.kind === "image") {
        f.url = URL.createObjectURL(file);
        await new Promise<void>((resolve) => {
          const im = new Image();
          im.onload = () => {
            f.w = im.naturalWidth;
            f.h = im.naturalHeight;
            resolve();
          };
          im.onerror = () => resolve();
          im.src = f.url!;
          setTimeout(resolve, 1500);
        });
      } else if (f.kind === "pdf") {
        const txt = await file.slice(0, 8e6).text();
        const m = txt.match(/\/Type\s*\/Page[^s]/g);
        if (m) f.pages = m.length;
      } else if (f.kind === "audio" || f.kind === "video") {
        await new Promise<void>((resolve) => {
          const el = document.createElement(f.kind as "audio" | "video");
          el.preload = "metadata";
          el.onloadedmetadata = () => {
            f.dur = el.duration;
            resolve();
          };
          el.onerror = () => resolve();
          el.src = URL.createObjectURL(file);
          setTimeout(resolve, 1500);
        });
      } else if (f.kind === "data" && file.size < 2e7) {
        const txt = await file.text();
        f.lines = txt.split("\n").length;
        f.text = txt;
      }
    }
  } catch {
    // Ignore extraction failure and keep basic info
  }
  return f;
}

export async function makePhoto(): Promise<File> {
  if (typeof document === "undefined") {
    return new File([new Blob(["fake-img"], { type: "image/png" })], "product-shot.png", { type: "image/png" });
  }
  const c = document.createElement("canvas");
  c.width = 1600;
  c.height = 1200;
  const x = c.getContext("2d")!;

  const g = x.createLinearGradient(0, 0, 1600, 1200);
  g.addColorStop(0, "#F6E7D8");
  g.addColorStop(1, "#E3D9FF");
  x.fillStyle = g;
  x.fillRect(0, 0, 1600, 1200);

  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(${120 + Math.random() * 80},${90 + Math.random() * 60},${160 + Math.random() * 80},${Math.random() * 0.05})`;
    x.beginPath();
    x.arc(Math.random() * 1600, Math.random() * 1200, Math.random() * 60, 0, 7);
    x.fill();
  }
  x.fillStyle = "rgba(0,0,0,.12)";
  x.beginPath();
  x.ellipse(800, 960, 330, 50, 0, 0, 7);
  x.fill();

  const b = x.createLinearGradient(600, 300, 1000, 900);
  b.addColorStop(0, "#FF9C82");
  b.addColorStop(1, "#7C6BFF");
  x.fillStyle = b;
  x.beginPath();
  x.roundRect(620, 330, 360, 620, 60);
  x.fill();

  x.fillStyle = "rgba(255,255,255,.35)";
  x.beginPath();
  x.roundRect(660, 380, 90, 480, 40);
  x.fill();
  x.fillStyle = "#17161B";
  x.beginPath();
  x.roundRect(720, 260, 160, 100, 24);
  x.fill();

  const blob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), "image/png"));
  return new File([blob], "product-shot.png", { type: "image/png" });
}

export interface SampleDefinition {
  label: string;
  f: () => Promise<FileInfo> | FileInfo;
}

export const SAMPLES: Record<string, SampleDefinition> = {
  pdf: {
    label: "PDF",
    f: () => ({ name: "Q3-report.pdf", size: 12.4e6, type: "application/pdf", kind: "pdf", pages: 24, sample: 1 }),
  },
  image: {
    label: "Photo",
    f: async () => {
      const file = await makePhoto();
      const f = await fromFile(file);
      f.size = Math.max(f.size, 2.1e6);
      f.realSize = f.file?.size ?? f.size;
      return f;
    },
  },
  audio: {
    label: "Song",
    f: () => ({ name: "interview.mp3", size: 17e6, type: "audio/mpeg", kind: "audio", dur: 1122, sample: 1 }),
  },
  video: {
    label: "Video",
    f: () => ({ name: "launch-teaser.mp4", size: 64e6, type: "video/mp4", kind: "video", dur: 48, sample: 1 }),
  },
  data: {
    label: "JSON",
    f: () => ({
      name: "api-response.json",
      size: 2.3e6,
      type: "application/json",
      kind: "data",
      lines: 41208,
      sample: 1,
    }),
  },
};

export const SUG: Record<FileKind, [string, string][]> = {
  pdf: [
    ["Compress", "compress it"],
    ["Convert to Word", "convert to word"],
    ["Split pages", "split pages 1-5"],
    ["Add signature", "sign it"],
    ["Protect", "protect with a password"],
  ],
  image: [
    ["Remove background", "remove the background"],
    ["Compress", "compress it"],
    ["Resize for Instagram", "resize for instagram"],
    ["Convert to WebP", "convert to webp"],
  ],
  audio: [
    ["Transcribe", "transcribe it"],
    ["Trim", "trim 0:00 to 0:30"],
    ["Convert to WAV", "convert to wav"],
  ],
  video: [
    ["Make a GIF", "make a gif"],
    ["Compress", "compress it"],
    ["Extract audio", "extract the audio"],
    ["Trim", "trim 0:00 to 0:10"],
  ],
  data: [
    ["Format & validate", "format and validate"],
    ["Convert to CSV", "convert to csv"],
    ["Generate types", "generate typescript types"],
  ],
  doc: [["Convert to PDF", "convert to pdf"]],
  other: [["Compress (zip)", "compress it"]],
};

export const NEXT: Record<FileKind, [string, string][]> = {
  pdf: [
    ["Sign it", "sign it"],
    ["To Word", "convert to word"],
    ["Protect", "protect with a password"],
  ],
  image: [
    ["Resize for Instagram", "resize for instagram"],
    ["Convert to JPG", "convert to jpg"],
    ["Compress more", "compress to under 200 kb"],
  ],
  audio: [
    ["Convert to MP3", "convert to mp3"],
    ["Trim", "trim 0:00 to 0:30"],
  ],
  video: [
    ["Compress", "compress it"],
    ["Extract audio", "extract the audio"],
  ],
  data: [
    ["Convert to CSV", "convert to csv"],
    ["Minify", "minify it"],
  ],
  doc: [["Compress", "compress it"]],
  other: [],
};
