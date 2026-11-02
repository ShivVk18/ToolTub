import type { ChainPreset } from "./types";
import { getTool } from "./tools";

/**
 * Preset Tool Chains. Every step's input must accept the previous step's output
 * (checked by validateChain at build time, see scripts and /chain/[slug]).
 */
export const chains: ChainPreset[] = [
  {
    slug: "optimize-image-for-web",
    name: "Optimize image for web",
    description: "Resize to 1600 px wide, compress, and convert to WebP in one go.",
    input: "image/*",
    steps: [
      { tool: "image-resizer", options: { maxWidth: 1600 } },
      { tool: "image-compressor", options: { quality: 0.8 } },
      { tool: "image-converter", options: { mime: "image/webp" } },
    ],
    answerQuestion: "How do I optimize an image for a website?",
    answerSummary:
      "Resize the image to the largest size it will be displayed at, usually 1600 pixels wide or less, compress it at quality 80, and save it as WebP. This chain does all three steps on your device in one click, typically cutting a phone photo from 4 MB to under 300 KB.",
  },
  {
    slug: "instagram-ready-photo",
    name: "Instagram-ready photo",
    description: "Fit to 1080 × 1350 (4:5 portrait) and compress for a crisp upload.",
    input: "image/*",
    steps: [
      { tool: "image-resizer", options: { maxWidth: 1080, maxHeight: 1350 } },
      { tool: "image-compressor", options: { quality: 0.85, mime: "image/jpeg" } },
    ],
    answerQuestion: "What size should an Instagram photo be?",
    answerSummary:
      "Use 1080 pixels wide; 1080 × 1350 (4:5) portrait takes up the most screen space in the feed. Upload a JPG under about 1 MB so Instagram recompresses it less. This chain resizes and compresses your photo on your device in one step, without uploading it to KlipKit.",
  },
  {
    slug: "iphone-photo-to-small-jpg",
    name: "iPhone photo to small JPG",
    description: "Convert HEIC to JPG, then compress it for email or forms.",
    input: "image/heic",
    steps: [
      { tool: "heic-to-jpg", options: { mime: "image/jpeg" } },
      { tool: "image-compressor", options: { quality: 0.75, maxWidth: 2000 } },
    ],
    answerQuestion: "How do I send an iPhone photo as a small JPG?",
    answerSummary:
      "Convert the HEIC photo to JPG, then compress it at about quality 75 and 2000 pixels wide. That usually turns a 2 MB HEIC into a JPG of 300 to 600 KB that opens on any device. This chain does both steps in your browser, so the photo never leaves your device.",
  },
];

export const getChain = (slug: string) => chains.find((c) => c.slug === slug);

/** A chain is live only when every step's tool has a page. */
export const isChainLive = (c: ChainPreset) => c.steps.every((s) => getTool(s.tool)?.status !== "planned");
