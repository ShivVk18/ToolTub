import type { ToolSEO } from "../types";
import { loc } from "./shared";

export const imageCompressor: ToolSEO = {
  primaryKeyword: "compress image",
  secondaryKeywords: ["image compressor", "reduce image size", "compress jpeg", "compress image to 50kb", "compress png online"],
  searchIntent: "do",
  title: "Image Compressor – Compress JPG, PNG, WebP Free | KlipKit",
  description: "Compress JPG, PNG, WebP and AVIF images free in your browser. Shrink photos up to 80% with no visible quality loss. No upload, no sign-up, batch support.",
  ogTitle: "Image Compressor — free, private, batch",
  ogDescription: "Shrink JPG, PNG, WebP and AVIF images in your browser. Nothing is uploaded.",
  ogAlt: "KlipKit Image Compressor showing a photo reduced from 4.2 MB to 610 KB",
  h1: "Image Compressor",
  answerQuestion: "How do I reduce an image's file size for free?",
  answerSummary:
    "Drop one or more images into KlipKit's Image Compressor, keep the default quality of 80 or set a target size in KB, and download the results. Compression runs in your browser, so photos are never uploaded. JPG, PNG, WebP and AVIF are supported, and most photos shrink by 50–80% with no visible difference.",
  keyFacts: [
    "Formats: JPG, PNG, WebP and AVIF in; JPG, PNG or WebP out",
    "Batch: up to 50 images at once, 50 MB each",
    "Processing: on your device in a background worker, using the browser's built-in image encoder; nothing is uploaded",
    "Typical result: phone photos shrink 50–80% at quality 80",
    "Options: quality, max width or height, target size in KB, keep or strip metadata",
    "Cost: free, no account, no watermark",
  ],
  howToSteps: [
    { name: "Add images", text: "Drag images in, paste a screenshot, or tap to pick photos from your device." },
    { name: "Pick quality or size", text: "Keep quality 80 for the best balance, or set a target such as 100 KB." },
    { name: "Download", text: "Click Compress images and download each file or all of them at once." },
  ],
  totalTime: "PT20S",
  faqs: [
    {
      q: "Does compressing an image reduce its quality?",
      a: "Slightly, but usually not visibly. At quality 80, JPG and WebP images keep detail that the eye cannot distinguish from the original on a screen, while the file shrinks by half or more. Below quality 60 you may notice blocky areas in skies and gradients, so lower it only when size matters most.",
    },
    {
      q: "How do I compress an image to 50 KB or 100 KB?",
      a: "Turn on Target size and enter 50 or 100 KB. KlipKit lowers quality and, if needed, dimensions until the image fits. Passport photos and signature scans for online forms usually reach 50 KB easily. Large landscape photos may need resizing to about 1200 pixels wide first.",
    },
    {
      q: "Are my photos uploaded to a server?",
      a: "No. KlipKit compresses images with your browser's built-in image encoder, in a background worker. Your photos stay on your device, are never stored, and never used for anything else. The page keeps working even if you disconnect from the internet after it loads.",
    },
    {
      q: "Should I use JPG, PNG or WebP?",
      a: "Use JPG or WebP for photos and PNG for screenshots, logos and images that need transparency. WebP is typically 25–35% smaller than JPG at the same visual quality and works in every modern browser. Choose JPG only when a website or form does not accept WebP.",
    },
    {
      q: "Why did my PNG barely shrink?",
      a: "PNG is a lossless format, so compressing it without changing it to another format saves less. Screenshots with many colours or photos saved as PNG compress poorly. Convert the image to WebP or JPG, or reduce its dimensions, to get a much smaller file.",
    },
    {
      q: "Can I compress many images at once?",
      a: "Yes. Drop up to 50 images at once and KlipKit compresses them one after another using the same settings. You can download each file separately or all of them together as a ZIP archive. Everything still runs in your browser, so large batches depend on your device's speed.",
    },
  ],
  comparisonTable: {
    caption: "Same 4 MB phone photo, different settings",
    headers: ["Setting", "Format", "Approx. size", "Visible difference"],
    rows: [
      ["Quality 90", "JPG", "≈ 1.6 MB", "None"],
      ["Quality 80 (default)", "JPG", "≈ 900 KB", "None on screen"],
      ["Quality 80", "WebP", "≈ 600 KB", "None on screen"],
      ["Target 100 KB", "JPG, resized", "≤ 100 KB", "Softer at full size"],
    ],
  },
  explainer:
    "Image compression removes detail that people are unlikely to notice. Lossy formats such as JPG, WebP and AVIF discard fine colour information; lossless formats such as PNG only reorganise data, so they shrink less.\n\nCompress images before emailing them, uploading them to forms with size limits, or publishing them on a website, where smaller images load faster and improve Core Web Vitals scores.\n\nCommon mistakes: compressing the same JPG repeatedly, which adds artefacts each time; saving photos as PNG, which makes them several times larger; and serving a 4000-pixel photo on a page where it displays at 800 pixels. Resize first, then compress, for the smallest file at the best quality.\n\nA quick rule of thumb: photos for the web rarely need more than 1600 pixels on the long side, thumbnails need about 400, and email attachments look fine at 1200. Pick the size first, then let the quality setting do the rest.",
  featureList: ["Compress JPG, PNG, WebP and AVIF", "Target size in KB", "Batch up to 50 images", "Processed in your browser", "No sign-up"],
  llmsLine: "Image Compressor: shrink JPG, PNG, WebP and AVIF in the browser (no upload), with quality and target-KB modes and batch support.",
  longTailVariants: [
    {
      slug: "compress-image-to-50kb",
      keyword: "compress image to 50kb",
      h1: "Compress Image to 50 KB",
      title: "Compress Image to 50 KB Online Free | KlipKit",
      description: "Reduce a photo or signature to under 50 KB for exam, job and government forms. Runs in your browser: no upload, no sign-up, no watermark. Free.",
      intro:
        "Exam, job and government portals often cap photos and signatures at 50 KB. This page opens the Image Compressor with a 50 KB target set, so you only need to drop the image in and download the result.",
      preset: { targetKB: 50 },
      faqs: [
        {
          q: "Will a 50 KB photo be accepted by government and exam portals?",
          a: "Usually, yes, as long as the dimensions also match. Portals often require both a size limit, such as 50 KB, and dimensions, such as 200 by 230 pixels. Resize the image to the required dimensions first, then compress it to 50 KB, so the result is both small and the right shape.",
        },
      ],
    },
  ],
  relatedGuides: ["png-vs-webp-vs-avif", "how-to-make-images-load-faster"],
  locales: loc("image-compressor"),
  lastReviewed: "2026-11-02",
  reviewedBy: "founder",
};
