import type { ToolSEO } from "../types";
import { loc } from "./shared";

export const heicToJpg: ToolSEO = {
  primaryKeyword: "heic to jpg",
  secondaryKeywords: ["heic converter", "convert iphone photo to jpg", "heic to jpg on windows", "heic to png", "open heic file"],
  searchIntent: "do",
  title: "HEIC to JPG Converter – Free, No Upload | KlipKit",
  description: "Convert iPhone HEIC photos to JPG or PNG free, right in your browser. Batch convert with no upload, no sign-up and no app install. Works on Windows and Android.",
  ogTitle: "HEIC to JPG — convert iPhone photos privately",
  ogDescription: "Batch-convert HEIC photos to JPG or PNG in your browser. Nothing is uploaded.",
  ogAlt: "KlipKit HEIC to JPG converter turning three iPhone photos into JPG files",
  h1: "HEIC to JPG Converter",
  answerQuestion: "How do I convert HEIC to JPG for free?",
  answerSummary:
    "Drop your HEIC photos into KlipKit's HEIC to JPG converter, choose JPG or PNG, and download. Conversion happens in your browser, so your photos are never uploaded. It works on Windows, Mac, Android and Chromebooks without installing anything, converts many photos at once, and is free with no sign-up.",
  keyFacts: [
    "Input: .heic and .heif files from iPhone and iPad, up to 50 MB each",
    "Output: JPG (quality 90 by default) or PNG",
    "Batch: up to 100 photos at once",
    "Processing: in your browser with a WebAssembly HEIC decoder; nothing is uploaded",
    "Works on Windows, macOS, Android, ChromeOS and Linux",
    "Cost: free, no account, no watermark",
  ],
  howToSteps: [
    { name: "Add HEIC photos", text: "Drag HEIC files in or tap to choose them from your device or the Files app." },
    { name: "Choose JPG or PNG", text: "JPG gives smaller files for sharing; PNG keeps every pixel exactly." },
    { name: "Download", text: "Click Convert and download each photo or all of them as a ZIP." },
  ],
  totalTime: "PT20S",
  faqs: [
    {
      q: "What is a HEIC file?",
      a: "HEIC (High Efficiency Image Container) is the photo format iPhones use by default since iOS 11. It stores photos at about half the size of JPG with similar quality. Many Windows programs, websites and older devices cannot open HEIC, which is why people convert it to JPG.",
    },
    {
      q: "Is converting HEIC to JPG on KlipKit private?",
      a: "Yes. KlipKit decodes HEIC files inside your browser using WebAssembly, so your photos never leave your device. Nothing is uploaded or stored, and the converter keeps working if you go offline after the page has loaded. Personal photos stay personal.",
    },
    {
      q: "Does converting HEIC to JPG lose quality?",
      a: "Very little. KlipKit saves JPG at quality 90, which is visually identical to the original for viewing and printing. The JPG will be larger than the HEIC because JPG compresses less efficiently. Choose PNG if you need a lossless copy for editing.",
    },
    {
      q: "How do I open HEIC files on Windows?",
      a: "The quickest way is to convert them to JPG in your browser with KlipKit, which needs no installation. Alternatively, install Microsoft's HEIF Image Extensions from the Microsoft Store, which lets the Photos app open HEIC files, though some other programs still will not.",
    },
    {
      q: "How do I stop my iPhone taking HEIC photos?",
      a: "Open Settings, tap Camera, then Formats, and choose Most Compatible. New photos will be saved as JPG instead of HEIC. Photos will take more storage, so many people keep High Efficiency and convert only the photos they need to share.",
    },
    {
      q: "Is the photo's date and location kept after conversion?",
      a: "No. KlipKit redraws each photo as a new JPG or PNG, so the result contains no metadata: date, camera model and GPS location are all removed. That makes converted photos safe to share publicly. Keep the original HEIC if you need the location and date for your photo library.",
    },
  ],
  comparisonTable: {
    caption: "HEIC vs JPG vs PNG",
    headers: ["Format", "Typical 12 MP photo", "Compatibility", "Best for"],
    rows: [
      ["HEIC", "≈ 1.5–2.5 MB", "Apple devices, recent Android", "Storing photos on iPhone"],
      ["JPG", "≈ 3–5 MB", "Everything", "Sharing and uploading"],
      ["PNG", "≈ 15–25 MB", "Everything", "Lossless editing"],
    ],
  },
  explainer:
    "HEIC uses the HEVC video codec to compress still images, which is why it is so efficient. Apple adopted it to save storage, but support outside Apple's ecosystem is still patchy: many Windows apps, web upload forms and older Android phones reject it.\n\nConvert to JPG when you need to email photos, upload them to a website, or open them on a Windows PC. Convert to PNG only when you plan to edit the photo and want no extra compression loss.\n\nCommon mistakes: renaming .heic to .jpg, which does not convert the file and makes it unreadable; uploading private photos to converter sites that keep copies; and converting Live Photos expecting video, which only gives you the still frame.\n\nIf you convert photos often, consider changing your iPhone's camera format to Most Compatible, or use AirDrop and the Mac Photos export option, which also produce JPG. For occasional photos sent from a Windows PC or an Android phone, a browser-based converter is the quickest option and needs no software.",
  featureList: ["Batch convert up to 100 HEIC photos", "JPG or PNG output", "Removes GPS location and metadata", "Processed in your browser", "No app install"],
  llmsLine: "HEIC to JPG: convert iPhone HEIC/HEIF photos to JPG or PNG in the browser (no upload), batch supported.",
  longTailVariants: [
    {
      slug: "heic-to-jpg-on-windows",
      keyword: "heic to jpg windows",
      h1: "Convert HEIC to JPG on Windows",
      title: "Convert HEIC to JPG on Windows 10 & 11 – Free | KlipKit",
      description: "Open and convert iPhone HEIC photos on Windows 10 and 11 without installing codecs or apps. Free and private: it runs in your browser, nothing is uploaded.",
      intro:
        "Windows does not open iPhone HEIC photos out of the box. Instead of installing codecs, drop the photos here: KlipKit converts them to JPG in your browser, so they open in every Windows app.",
      preset: { format: "jpeg" },
      faqs: [
        {
          q: "Do I need to install HEIF extensions on Windows?",
          a: "No. KlipKit converts HEIC to JPG in your browser, so nothing needs installing. Microsoft's HEIF and HEVC extensions let the Photos app display HEIC files, but the HEVC extension can cost money and many programs still will not open HEIC. Converting to JPG works everywhere.",
        },
      ],
    },
  ],
  relatedGuides: ["heic-vs-jpg-explained", "how-to-transfer-iphone-photos-to-windows"],
  locales: loc("heic-to-jpg"),
  lastReviewed: "2026-11-02",
  reviewedBy: "founder",
};
