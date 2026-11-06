import type { CategoryId, HubId } from "./types";

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  blurb: string;
  /** Tailwind classes for the category accent (cards, badges). */
  accent: string;
  hubs: HubId[];
}

export const categories: CategoryMeta[] = [
  {
    id: "productivity",
    name: "Productivity",
    blurb: "PDFs, images, documents and everyday files.",
    accent: "from-sky-500/15 to-sky-500/0 text-sky-600 dark:text-sky-400 ring-sky-500/30",
    hubs: ["pdf-tools", "image-tools", "text-tools", "utility-tools"],
  },
  {
    id: "developer",
    name: "Developer",
    blurb: "Format, encode, decode, test and generate.",
    accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
    hubs: ["developer-tools"],
  },
  {
    id: "creator",
    name: "Creator",
    blurb: "Video, subtitles, visuals and post formatting, with on-device AI.",
    accent: "from-fuchsia-500/15 to-fuchsia-500/0 text-fuchsia-600 dark:text-fuchsia-400 ring-fuchsia-500/30",
    hubs: ["video-tools", "creator-tools"],
  },
];

export interface HubMeta {
  id: HubId;
  name: string;
  category: CategoryId;
  h1: string;
  /** <title>, ≤ 60 characters. */
  title: string;
  description: string;
  answerQuestion: string;
  answerSummary: string;
}

export const hubs: HubMeta[] = [
  {
    id: "pdf-tools",
    name: "PDF Tools",
    category: "productivity",
    h1: "Free PDF Tools",
    title: "Free PDF Tools – Private, No Upload | KlipKit",
    description:
      "Compress, merge, split and convert PDFs free. Most tools run in your browser, so files never leave your device. No sign-up, no watermark, no limits.",
    answerQuestion: "What can I do with KlipKit's free PDF tools?",
    answerSummary:
      "You can compress, merge, split, rotate and convert PDFs to and from Word and images. Most KlipKit PDF tools run entirely in your browser, so your files are not uploaded. Office conversions use a secure server and delete files after one hour. Every tool is free with no sign-up or watermark.",
  },
  {
    id: "image-tools",
    name: "Image Tools",
    category: "productivity",
    h1: "Free Image Tools",
    title: "Free Image Tools – Compress, Resize, Convert | KlipKit",
    description:
      "Compress, resize and convert JPG, PNG, WebP, AVIF and iPhone HEIC images in your browser. Private and instant: nothing is uploaded, no sign-up needed.",
    answerQuestion: "How do I compress, resize or convert an image for free?",
    answerSummary:
      "Pick the KlipKit image tool for the job, drop your image in, adjust the one or two settings that matter, and download. Every KlipKit image tool runs in your browser, so photos are never uploaded. JPG, PNG, WebP, AVIF and iPhone HEIC files are supported, free and without sign-up.",
  },
  {
    id: "text-tools",
    name: "Text Tools",
    category: "productivity",
    h1: "Free Text Tools",
    title: "Free Text Tools – Word Counter, Diff & More | KlipKit",
    description:
      "Count words, compare text, change case and clean up pasted text. Free text tools that run in your browser as you type, with no sign-up and no tracking.",
    answerQuestion: "What are KlipKit's text tools for?",
    answerSummary:
      "KlipKit's text tools count words and characters, compare two texts, convert case and clean up pasted text. Everything runs in your browser as you type, so nothing you paste is sent anywhere. They are free, need no account and work on phones and desktops.",
  },
  {
    id: "utility-tools",
    name: "Everyday Utilities",
    category: "productivity",
    h1: "Free Everyday Utilities",
    title: "Free QR Code & Everyday Utilities | KlipKit",
    description:
      "Make QR codes that never expire, barcodes and quick conversions. Free everyday utilities that run in your browser: private, instant, no sign-up needed.",
    answerQuestion: "What everyday utilities does KlipKit offer?",
    answerSummary:
      "KlipKit offers a QR code generator, barcode generator and quick unit and time-zone converters. They run in your browser, export print-ready PNG or SVG files, and never add watermarks or expiring links. Every utility is free and needs no account.",
  },
  {
    id: "developer-tools",
    name: "Developer Tools",
    category: "developer",
    h1: "Free Online Developer Tools",
    title: "Free Developer Tools – Runs Locally | KlipKit",
    description:
      "JSON formatter, JWT decoder, Base64, regex tester, UUID and more. Runs locally in your browser, so tokens and data never leave your machine. Free.",
    answerQuestion: "Are online developer tools safe for tokens and private data?",
    answerSummary:
      "They are safe when the tool runs entirely in your browser. Every KlipKit developer tool processes data locally with JavaScript, so JSON, JSON Web Tokens and secrets are never sent to a server. You can confirm this by opening your browser's network tab while using the tool.",
  },
  {
    id: "video-tools",
    name: "Video & Audio Tools",
    category: "creator",
    h1: "Free Video & Audio Tools That Run in Your Browser",
    title: "Free Video & Audio Tools, No Upload | KlipKit",
    description:
      "Compress, convert, trim and transcribe video on your own device with browser-based tools. No upload, no watermark, no sign-up. Free for clips up to 10 min.",
    answerQuestion: "Can I edit video online without uploading it?",
    answerSummary:
      "Yes. KlipKit's video tools use your browser's built-in video encoder (WebCodecs), so clips are compressed, converted and trimmed on your device and never uploaded. Transcription uses a small Whisper model that runs locally. Clips up to about 10 minutes work smoothly on recent phones and laptops.",
  },
  {
    id: "creator-tools",
    name: "Creator Tools",
    category: "creator",
    h1: "Free Tools for Content Creators",
    title: "Free Tools for Content Creators | KlipKit",
    description:
      "Remove backgrounds with on-device AI, resize images for every social platform, preview thumbnails and format posts. Private, free, no sign-up needed.",
    answerQuestion: "What free tools help creators publish faster?",
    answerSummary:
      "KlipKit's creator tools remove image backgrounds with on-device AI, resize images for every social platform in one click, preview YouTube thumbnails and format posts with bold and italic text. Everything runs in your browser, so files stay on your device. All tools are free with no sign-up.",
  },
];

export const getHub = (id: string) => hubs.find((h) => h.id === id);
