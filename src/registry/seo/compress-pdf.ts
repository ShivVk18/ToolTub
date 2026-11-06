import type { ToolSEO } from "../types";
import { loc } from "./shared";

export const compressPdf: ToolSEO = {
  primaryKeyword: "compress pdf",
  secondaryKeywords: [
    "reduce pdf size",
    "pdf compressor online free",
    "compress pdf to 100kb",
    "make pdf smaller",
    "compress pdf without uploading",
  ],
  searchIntent: "do",
  title: "Compress PDF Online Free – Reduce PDF Size | KlipKit",
  description:
    "Compress PDF files free in your browser. Reduce PDF size for email and upload forms with no upload, no sign-up and no watermark. Works on phone and desktop.",
  ogTitle: "Compress PDF — free, private, in your browser",
  ogDescription: "Shrink PDFs for email and upload portals without sending them to a server.",
  ogAlt: "KlipKit Compress PDF tool showing a PDF shrinking from 8.4 MB to 1.9 MB",
  h1: "Compress PDF",
  answerQuestion: "How do I compress a PDF for free?",
  answerSummary:
    "Drop your PDF into KlipKit's Compress PDF tool, choose Recommended, Strong or a target size such as 100 KB, and download the smaller file. Compression runs in your browser, so the PDF is never uploaded. There is no sign-up and no watermark. Image-heavy PDFs usually shrink the most.",
  keyFacts: [
    "Input: PDF files up to 200 MB",
    "Levels: Recommended (150 dpi), Strong (96 dpi), or a target size in KB",
    "Processing: in your browser; embedded images are resampled on your device and nothing is uploaded",
    "Typical result: scanned and image-heavy PDFs shrink 40–80%; text-only PDFs shrink less than 20%",
    "Output: a standard PDF that keeps selectable text and links",
    "Cost: free, no account, no watermark, no daily limit",
  ],
  howToSteps: [
    { name: "Add your PDF", text: "Drag the PDF into the box, paste it, or tap to choose a file from your device." },
    {
      name: "Choose a level",
      text: "Keep Recommended, pick Strong for the smallest file, or enter a target size such as 100 KB.",
    },
    { name: "Download", text: "Click Compress PDF, check the before and after size, then download the smaller file." },
  ],
  totalTime: "PT30S",
  faqs: [
    {
      q: "Is it safe to compress a PDF on KlipKit?",
      a: "Yes. KlipKit compresses PDFs inside your browser, so the file never leaves your device and nothing is stored on a server. You can confirm it by turning off Wi-Fi after the page loads: compression still works. No account or email address is needed.",
    },
    {
      q: "How can I compress a PDF to 100 KB?",
      a: "Enter 100 KB as the target size and KlipKit lowers image resolution step by step until the file fits. Scanned documents of one or two pages usually reach 100 KB. Long or photo-heavy PDFs may not, and the tool tells you the smallest size it reached so you can split the file.",
    },
    {
      q: "Does compressing a PDF reduce quality?",
      a: "Only images are affected; text, vector graphics and links stay sharp. Recommended mode resamples images to 150 dpi, which looks the same on screen and prints well. Strong mode uses 96 dpi, which is fine for screens but can look soft when printed at full page size.",
    },
    {
      q: "Why did my PDF barely get smaller?",
      a: "Your PDF is probably mostly text or already compressed. Text and fonts are small and compress very little, so most savings come from large images. If a PDF contains embedded fonts you do not need, try printing it to PDF again, or split out the pages you need first.",
    },
    {
      q: "Can I compress a PDF on my iPhone or Android phone?",
      a: "Yes. Open klipkit.com/compress-pdf in Safari or Chrome, tap the upload area and choose the PDF from Files or Downloads. Compression runs on the phone itself. Very large files above about 100 MB may be slow on older phones, so close other tabs first.",
    },
    {
      q: "Does KlipKit add a watermark or limit how many PDFs I compress?",
      a: "No. KlipKit never adds watermarks and has no daily limit, because compression runs on your own device and costs us nothing per file. You can compress as many PDFs as you like, one after another, without creating an account or paying.",
    },
  ],
  comparisonTable: {
    caption: "Compression levels compared",
    headers: ["Level", "Image resolution", "Typical size reduction", "Best for"],
    rows: [
      ["Recommended", "150 dpi", "40–70% on image-heavy PDFs", "Email, sharing, printing"],
      ["Strong", "96 dpi", "60–85% on image-heavy PDFs", "Upload forms with strict limits"],
      ["Target size (e.g. 100 KB)", "Adjusted automatically", "Until the target is met", "Government and job portals"],
    ],
  },
  explainer:
    "A PDF's size comes mostly from images: scanned pages, photos and screenshots. Text, fonts and vector drawings are tiny by comparison. Compressing a PDF therefore means re-encoding its images at a lower resolution and stronger JPEG quality, and removing duplicate or unused data.\n\nUse Recommended for anything you will print or read on a large screen. Use Strong or a target size when a portal rejects files above a limit, such as 100 KB, 200 KB or 2 MB for job and visa applications.\n\nCommon mistakes: compressing an already compressed PDF several times, which degrades images without saving much; converting a PDF to images and back, which removes selectable text; and uploading confidential documents to tools that keep files on their servers. KlipKit avoids the last one by doing everything in your browser.\n\nTo check the result, open the compressed file and zoom into a photo or scanned page at 100%. If text in a scan looks blurry, go back one level. For documents you must print at high quality, such as brochures, keep the original and send the compressed copy only where a size limit forces you to.",
  featureList: [
    "Reduce PDF size by up to 85% on image-heavy files",
    "Target size in KB",
    "Processed in your browser",
    "No sign-up",
    "No watermark",
  ],
  llmsLine:
    "Compress PDF: reduce PDF file size in the browser (no upload), with Recommended, Strong or target-KB modes.",
  longTailVariants: [
    {
      slug: "compress-pdf-to-100kb",
      keyword: "compress pdf to 100kb",
      h1: "Compress PDF to 100 KB",
      title: "Compress PDF to 100 KB Online Free | KlipKit",
      description:
        "Reduce a PDF to under 100 KB for job portals, exam forms and government sites. Runs in your browser: no upload, no sign-up, no watermark. Free.",
      intro:
        "Many job, exam and visa portals reject PDFs above 100 KB. This page opens KlipKit's PDF compressor with a 100 KB target already set: drop your file in and it lowers image quality only as much as needed to fit.",
      preset: { targetKB: 100 },
      faqs: [
        {
          q: "Can every PDF be compressed to 100 KB?",
          a: "No. One- or two-page scans usually fit, but long documents or many photos may not reach 100 KB while staying readable. KlipKit shows the smallest size it achieved. If it is still too big, split the PDF and upload only the required pages, or scan in grayscale at 150 dpi.",
        },
      ],
    },
  ],
  relatedGuides: ["how-to-compress-pdf-for-email", "pdf-size-limits-for-government-portals"],
  locales: loc("compress-pdf"),
  lastReviewed: "2026-11-02",
  reviewedBy: "founder",
};
