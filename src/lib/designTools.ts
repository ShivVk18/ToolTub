export interface ToolItem {
  n: string; // name
  c: "p" | "d" | "c"; // category key: Productivity, Developer, Creator
  i: string; // icon key
  d: string; // description
  s?: string; // 'server' if private server
  slug?: string;
}

export interface CategoryInfo {
  n: string;
  c: string;
}

export const CATS: Record<"p" | "d" | "c", CategoryInfo> = {
  p: { n: "Productivity", c: "#E5484D" },
  d: { n: "Developer", c: "#6D5DF5" },
  c: { n: "Creator", c: "#1F9D63" },
};

export const TOOLS: ToolItem[] = [
  // Productivity
  { n: "Compress PDF", c: "p", i: "pdf", d: "Shrink PDFs without losing quality", slug: "compress-pdf" },
  { n: "Merge PDF", c: "p", i: "pdf", d: "Combine files in any order", slug: "merge-pdf" },
  { n: "Split PDF", c: "p", i: "pdf", d: "Pull out pages or ranges", slug: "split-pdf" },
  { n: "PDF to Word", c: "p", i: "doc", d: "Editable .docx in seconds", s: "server", slug: "pdf-to-word" },
  { n: "Word to PDF", c: "p", i: "doc", d: "Perfect PDFs from Office files", s: "server", slug: "word-to-pdf" },
  { n: "PDF to JPG", c: "p", i: "pdf", d: "Every page as an image", slug: "pdf-to-jpg" },
  { n: "JPG to PDF", c: "p", i: "pdf", d: "Photos into one tidy PDF", slug: "jpg-to-pdf" },
  { n: "Rotate PDF", c: "p", i: "pdf", d: "Rotate, reorder, delete pages", slug: "rotate-pdf" },
  { n: "Fill & Sign", c: "p", i: "pdf", d: "Sign forms without printing", slug: "fill-and-sign" },
  { n: "Protect PDF", c: "p", i: "lock", d: "Add or remove a password", s: "server", slug: "protect-pdf" },
  { n: "Watermark PDF", c: "p", i: "pdf", d: "Stamp text or a logo", slug: "watermark-pdf" },
  { n: "Image Compressor", c: "p", i: "img", d: "Smaller JPG, PNG, WebP, AVIF", slug: "image-compressor" },
  { n: "Resize Image", c: "p", i: "img", d: "Exact pixels or presets", slug: "image-resizer" },
  { n: "Convert Image", c: "p", i: "img", d: "PNG, JPG, WebP, AVIF", slug: "image-converter" },
  { n: "HEIC to JPG", c: "p", i: "img", d: "iPhone photos that open anywhere", slug: "heic-to-jpg" },
  { n: "Crop Image", c: "p", i: "img", d: "Crop, rotate and flip", slug: "crop-image" },
  { n: "Passport Photo", c: "p", i: "img", d: "Right size for any country", slug: "passport-photo" },
  { n: "Image to Text", c: "p", i: "txt", d: "Copy text from any image", slug: "image-to-text" },
  { n: "Bulk Rename", c: "p", i: "img", d: "Rename & resize in batches", slug: "bulk-rename" },
  { n: "Word Counter", c: "p", i: "txt", d: "Words, characters, reading time", slug: "word-counter" },
  { n: "Diff Checker", c: "p", i: "txt", d: "See exactly what changed", slug: "diff-checker" },
  { n: "Case Converter", c: "p", i: "txt", d: "UPPER, lower, Title, camel", slug: "case-converter" },
  { n: "Resume Builder", c: "p", i: "doc", d: "ATS-friendly, PDF export", slug: "resume-builder" },
  { n: "Clean Text", c: "p", i: "txt", d: "Remove line breaks & junk", slug: "clean-text" },
  { n: "Lorem Ipsum", c: "p", i: "txt", d: "Placeholder text on tap", slug: "lorem-ipsum" },
  { n: "QR Code", c: "p", i: "qr", d: "URL, Wi-Fi, vCard, with logo", slug: "qr-code-generator" },
  { n: "Barcode", c: "p", i: "qr", d: "EAN, UPC, Code128", slug: "barcode-generator" },
  { n: "Unit Converter", c: "p", i: "txt", d: "Units and time zones", slug: "unit-converter" },

  // Developer
  { n: "JSON Formatter", c: "d", i: "code", d: "Format, validate, minify", slug: "json-formatter" },
  { n: "JWT Decoder", c: "d", i: "lock", d: "Inspect claims & expiry", slug: "jwt-decoder" },
  { n: "Base64", c: "d", i: "code", d: "Encode & decode text and files", slug: "base64" },
  { n: "Regex Tester", c: "d", i: "code", d: "Live matches & groups", slug: "regex-tester" },
  { n: "UUID Generator", c: "d", i: "code", d: "v4 & ULID, in bulk", slug: "uuid-generator" },
  { n: "URL Encoder", c: "d", i: "code", d: "Encode, decode, parse", slug: "url-encoder" },
  { n: "Timestamp", c: "d", i: "code", d: "Unix ↔ human dates", slug: "timestamp" },
  { n: "Hash Generator", c: "d", i: "lock", d: "SHA-256, SHA-512, HMAC", slug: "hash-generator" },
  { n: "SQL Formatter", c: "d", i: "code", d: "Readable queries", slug: "sql-formatter" },
  { n: "YAML ↔ JSON", c: "d", i: "code", d: "Convert both ways", slug: "yaml-to-json" },
  { n: "CSV ↔ JSON", c: "d", i: "code", d: "Convert both ways", slug: "csv-to-json" },
  { n: "JSON to TypeScript", c: "d", i: "code", d: "Types from any JSON", slug: "json-to-typescript" },
  { n: "Cron Builder", c: "d", i: "code", d: "Next runs, explained", slug: "cron-builder" },
  { n: "API Tester", c: "d", i: "code", d: "Send requests, see replies", slug: "api-tester" },
  { n: "Code Playground", c: "d", i: "code", d: "HTML, CSS, JS live", slug: "code-playground" },
  { n: "Color Converter", c: "d", i: "spark", d: "HEX, RGB, HSL, OKLCH", slug: "color-converter" },
  { n: "Minifier", c: "d", i: "code", d: "HTML, CSS, JS", slug: "minifier" },
  { n: "Markdown Editor", c: "d", i: "txt", d: "Write & preview", slug: "markdown-editor" },
  { n: "Password Generator", c: "d", i: "lock", d: "Strong & memorable", slug: "password-generator" },
  { n: ".env Redactor", c: "d", i: "lock", d: "Hide secrets before sharing", slug: "env-redactor" },
  { n: "Meta Tag Generator", c: "d", i: "code", d: "SEO & Open Graph tags", slug: "meta-tag-generator" },
  { n: "Schema Generator", c: "d", i: "code", d: "JSON-LD in clicks", slug: "schema-generator" },
  { n: "Chmod Calculator", c: "d", i: "code", d: "Permissions, explained", slug: "chmod-calculator" },
  { n: "HTML Entities", c: "d", i: "code", d: "Encode & decode", slug: "html-entities" },
  { n: "Base Converter", c: "d", i: "code", d: "Bin, hex, dec, oct", slug: "base-converter" },
  { n: "CSS Gradients", c: "d", i: "spark", d: "Gradients & shadows", slug: "css-gradients" },

  // Creator
  { n: "Background Remover", c: "c", i: "spark", d: "Clean cutouts, on device", slug: "background-remover" },
  { n: "Transcribe", c: "c", i: "audio", d: "Speech to text, on device", slug: "transcribe" },
  { n: "Subtitles", c: "c", i: "video", d: "SRT & VTT with timings", slug: "subtitles" },
  { n: "Social Resizer", c: "c", i: "img", d: "Every platform, one tap", slug: "social-resizer" },
  { n: "Thumbnail Preview", c: "c", i: "video", d: "See it in the feed first", slug: "thumbnail-preview" },
  { n: "Post Formatter", c: "c", i: "txt", d: "Bold, italic, line breaks", slug: "post-formatter" },
  { n: "Caption Builder", c: "c", i: "txt", d: "Proven caption formulas", slug: "caption-builder" },
  { n: "Hashtag Finder", c: "c", i: "txt", d: "Curated by niche", slug: "hashtag-finder" },
  { n: "Bio Formatter", c: "c", i: "txt", d: "Perfect bios, every app", slug: "bio-formatter" },
  { n: "Image Upscaler", c: "c", i: "spark", d: "2× sharper, on device", slug: "image-upscaler" },
  { n: "Video to GIF", c: "c", i: "video", d: "Loop anything", slug: "video-to-gif" },
  { n: "Compress Video", c: "c", i: "video", d: "Smaller, still sharp", slug: "compress-video" },
  { n: "Trim Video", c: "c", i: "video", d: "Cut to the good part", slug: "trim-video" },
  { n: "Extract Audio", c: "c", i: "audio", d: "MP3 from any video", slug: "extract-audio" },
  { n: "Audio Converter", c: "c", i: "audio", d: "MP3, WAV, M4A, trim", slug: "audio-converter" },
  { n: "Screen Recorder", c: "c", i: "video", d: "No install, no upload", slug: "screen-recorder" },
  { n: "Text to Speech", c: "c", i: "audio", d: "Read text aloud", slug: "text-to-speech" },
  { n: "Meme Maker", c: "c", i: "img", d: "Your templates, your text", slug: "meme-maker" },
  { n: "Watermark", c: "c", i: "img", d: "Text or logo, in batches", slug: "watermark" },
  { n: "Color Palette", c: "c", i: "spark", d: "Palettes from photos", slug: "color-palette" },
  { n: "Eyedropper", c: "c", i: "spark", d: "Pick any color", slug: "eyedropper" },
  { n: "Collage Maker", c: "c", i: "img", d: "Grids in seconds", slug: "collage-maker" },
];

export const TOOL_ICON_PATHS: Record<string, string> = {
  pdf: "M7 3h7l5 5v13H7z M14 3v5h5",
  doc: "M7 3h7l5 5v13H7z M10 13h6 M10 17h6",
  img: "M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8z M9 11.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z M21 16l-5-5-8 8",
  txt: "M5 6h14 M5 11h14 M5 16h9",
  code: "M9 8l-4 4 4 4 M15 8l4 4-4 4",
  lock: "M5 13a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4z M8 10V7a4 4 0 0 1 8 0v3",
  qr: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 18h2v2h-2z",
  audio: "M4 10v4 M8 7v10 M12 4v16 M16 8v8 M20 11v2",
  video: "M3 9a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9z M16 10l5-3v10l-5-3",
  spark: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
};

export const tint = (color: string): string => color + "1f";

export const toolKind = (t: ToolItem): "pdf" | "doc" | "image" | "audio" | "video" | "data" => {
  if (t.i === "pdf") return "pdf";
  if (t.i === "doc") return "doc";
  if (t.i === "img") return "image";
  if (t.i === "audio") return "audio";
  if (t.i === "video") return "video";
  if (t.i === "code" || t.i === "txt" || t.i === "qr") return "data";
  if (t.i === "lock") return t.c === "p" ? "pdf" : "data";
  if (t.i === "spark") return t.c === "c" ? "image" : "data";
  return "data";
};
