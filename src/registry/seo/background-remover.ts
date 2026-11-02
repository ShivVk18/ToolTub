import type { ToolSEO } from "../types";
import { loc } from "./shared";

export const backgroundRemover: ToolSEO = {
  primaryKeyword: "background remover",
  secondaryKeywords: ["remove background from image", "transparent background", "remove bg free", "background remover without upload", "white background photo"],
  searchIntent: "do",
  title: "Background Remover – Free, On-Device AI | KlipKit",
  description: "Remove image backgrounds free with AI that runs on your device. Download a transparent PNG or add a white or colour background. No upload, no sign-up.",
  ogTitle: "Background Remover — AI that runs on your device",
  ogDescription: "Transparent PNGs in seconds, without uploading your photos.",
  ogAlt: "KlipKit Background Remover cutting out a person against a checkerboard transparent background",
  h1: "Background Remover",
  answerQuestion: "How do I remove the background from an image for free?",
  answerSummary:
    "Drop a photo into KlipKit's Background Remover and an AI model running on your device cuts out the subject in a few seconds. Download a transparent PNG, or pick white or any colour as the new background. Photos are not uploaded, there is no sign-up, and full-resolution downloads are free.",
  keyFacts: [
    "Input: JPG, PNG, WebP or HEIC up to 25 MB",
    "Output: full-resolution transparent PNG, or a solid background colour",
    "Processing: open-source AI model (ISNet, Apache-2.0) runs in your browser; about 44 MB, downloaded once from klipkit.com and cached",
    "Speed: about 2–6 seconds per photo on a recent laptop or phone",
    "Works best on people, products and animals with a clear subject",
    "Cost: free, full resolution, no watermark",
  ],
  howToSteps: [
    { name: "Add a photo", text: "Drag a photo in, paste one, or take a photo on your phone." },
    { name: "Wait for the cut-out", text: "The AI model removes the background on your device in a few seconds." },
    { name: "Download", text: "Download a transparent PNG, or choose a background colour first." },
  ],
  totalTime: "PT15S",
  faqs: [
    {
      q: "Is KlipKit's background remover really free at full resolution?",
      a: "Yes. Because the AI model runs on your own device, each image costs KlipKit nothing to process, so there is no reason to limit resolution or add watermarks. Many popular removers give free users a small preview and charge for full size; KlipKit does not.",
    },
    {
      q: "Are my photos uploaded?",
      a: "No. The background removal model is downloaded from klipkit.com to your browser once, about 44 MB, and then runs locally. Your photos are processed on your device and never sent to KlipKit or anyone else. After the first use, the model loads from cache and works offline.",
    },
    {
      q: "Why is the first use slower?",
      a: "The first time, your browser downloads the AI model, which takes a few seconds on a fast connection. It is then cached, so later images start almost instantly. Devices with WebGPU, such as recent Chrome and Edge, process images faster than those using the CPU fallback.",
    },
    {
      q: "How do I make a photo with a white background?",
      a: "Remove the background, then choose White under Background and download as JPG. This is the format most marketplaces, such as Amazon, and passport photo services require. For passport photos specifically, use the Passport Photo Maker, which also crops to the right size.",
    },
    {
      q: "Why are hair and edges not perfect?",
      a: "Fine hair, fur, glass and objects that blend into the background are the hardest cases for any background remover. Photos with good lighting and clear contrast between the subject and the background give the cleanest edges. Start from the largest original you have, not a screenshot or a compressed copy.",
    },
    {
      q: "Can I use the result commercially?",
      a: "Yes. You own your images, and KlipKit claims no rights over them or the cut-outs. The on-device model KlipKit uses is licensed for commercial use. Make sure you have the rights to the original photo, especially for images of other people or brands.",
    },
  ],
  comparisonTable: {
    caption: "KlipKit vs typical background removers",
    headers: ["", "KlipKit", "Typical free remover"],
    rows: [
      ["Where the photo goes", "Stays on your device", "Uploaded to a server"],
      ["Free resolution", "Full resolution", "Low-resolution preview"],
      ["Watermark", "None", "Sometimes"],
      ["Account", "Not needed", "Needed for HD download"],
    ],
  },
  explainer:
    "AI background removal uses a segmentation model that predicts, for every pixel, how likely it is to belong to the foreground. That prediction becomes an alpha mask; applying it to the original photo gives a transparent PNG.\n\nUse it for product photos, profile pictures, passport and ID photos, thumbnails and design mock-ups. A transparent PNG can then be placed on any background.\n\nCommon mistakes: saving the result as JPG, which cannot store transparency and fills it with black or white; starting from a low-resolution screenshot, which gives jagged edges; and uploading personal photos to removers that keep them. On-device models avoid the last problem entirely.\n\nFor product photos, shoot against a plain, contrasting background with even lighting and keep the whole object in focus. For portraits, avoid backgrounds with the same colour as hair or clothing. After removing the background, add a white background for marketplaces, or keep the transparent PNG for designs, slides and thumbnails.",
  featureList: ["AI background removal on your device", "Full-resolution transparent PNG", "White or colour background", "No upload", "No watermark"],
  llmsLine: "Background Remover: remove image backgrounds with an on-device AI model in the browser; full-resolution transparent PNG, no upload.",
  relatedGuides: ["how-to-make-a-passport-photo-at-home", "png-vs-webp-vs-avif"],
  locales: loc("background-remover"),
  lastReviewed: "2026-11-02",
  reviewedBy: "founder",
};
