import type { ToolSEO } from "../types";
import { loc } from "./shared";

export const qrCodeGenerator: ToolSEO = {
  primaryKeyword: "qr code generator",
  secondaryKeywords: [
    "free qr code generator no expiry",
    "wifi qr code",
    "qr code for link",
    "qr code with logo",
    "vcard qr code",
  ],
  searchIntent: "do",
  title: "QR Code Generator – Free, No Expiry, No Sign-up | KlipKit",
  description:
    "Create QR codes for links, Wi-Fi and contact cards free. Static codes that never expire, PNG and SVG download, custom colours. No sign-up, no tracking.",
  ogTitle: "QR Code Generator — free forever, never expires",
  ogDescription: "Static QR codes for links, Wi-Fi and contacts. PNG and SVG, no sign-up.",
  ogAlt: "KlipKit QR Code Generator creating a Wi-Fi QR code",
  h1: "QR Code Generator",
  answerQuestion: "How do I make a free QR code that never expires?",
  answerSummary:
    "Enter a link, Wi-Fi details or contact card in KlipKit's QR Code Generator and download the code as PNG or SVG. KlipKit creates static QR codes that contain your data directly, so they never expire, never redirect through a third party and keep working forever. It is free with no sign-up.",
  keyFacts: [
    "Types: URL, plain text, Wi-Fi network, contact card (vCard), email and phone",
    "Downloads: PNG up to 2048 px and SVG (vector, for print)",
    "Static codes: data is stored in the QR code itself, so it never expires",
    "No tracking redirects and no scan analytics",
    "Error correction levels L, M, Q and H; custom colours",
    "Processing: in your browser; free, no account",
  ],
  howToSteps: [
    { name: "Choose a type", text: "Pick Link, Text, Wi-Fi or Contact." },
    {
      name: "Enter details",
      text: "Type the URL, network name and password, or contact details. The preview updates live.",
    },
    { name: "Download", text: "Download PNG for screens or SVG for print, then test-scan it with your phone." },
  ],
  totalTime: "PT20S",
  faqs: [
    {
      q: "Do KlipKit QR codes expire?",
      a: "No. KlipKit makes static QR codes, which store your link or text directly in the pattern. There is no redirect server in between, so the code works for as long as the destination exists. Many free generators create dynamic codes that stop working when a trial ends.",
    },
    {
      q: "What is the difference between static and dynamic QR codes?",
      a: "A static QR code contains the final data, such as your URL, and cannot be changed after printing. A dynamic QR code contains a short redirect link controlled by a service, so you can change the destination and see scan counts, but it breaks if that service shuts down or you stop paying.",
    },
    {
      q: "How do I make a QR code for Wi-Fi?",
      a: "Choose Wi-Fi, enter the network name (SSID), the password and the security type, usually WPA2 or WPA3, then download. When guests scan it with a phone camera, they join the network without typing the password. The password is stored in the code, so only display it where you trust visitors.",
    },
    {
      q: "Should I download PNG or SVG?",
      a: "Use PNG for websites, slides and messaging, and SVG for anything printed, such as posters, packaging and business cards. SVG is a vector format, so it stays perfectly sharp at any size. For print, keep the code at least 2 centimetres wide and leave a white margin around it.",
    },
    {
      q: "Can I add colours or a logo to my QR code?",
      a: "Yes, you can change the foreground and background colours; a logo option is planned. Keep strong contrast, with a dark code on a light background, and use error correction level H when placing a logo over the centre so that phones can still read the code.",
    },
    {
      q: "Does KlipKit track who scans my QR code?",
      a: "No. Because KlipKit QR codes are static, scans go straight from the phone to your link without passing through KlipKit. We cannot see who scanned the code, when or where. If you need scan analytics, add UTM parameters to your URL and read them in your own analytics.",
    },
  ],
  comparisonTable: {
    caption: "Static vs dynamic QR codes",
    headers: ["", "Static (KlipKit)", "Dynamic (typical paid service)"],
    rows: [
      ["Expires", "Never", "When the subscription ends"],
      ["Edit destination after printing", "No", "Yes"],
      ["Scan tracking", "No (private)", "Yes"],
      ["Cost", "Free", "Often a monthly fee"],
    ],
  },
  explainer:
    "A QR (Quick Response) code is a two-dimensional barcode that phones read with their camera. It stores text, which may be a URL, Wi-Fi credentials or a contact card, using built-in error correction so it still scans when partly damaged or covered.\n\nUse QR codes on menus, posters, packaging, business cards, event badges and slides, wherever people need to open a link or join a network without typing.\n\nCommon mistakes: using a free dynamic generator whose codes stop working after a trial; printing codes too small or without a white margin (the quiet zone); low contrast colour combinations; and long URLs that create dense codes. Shorten very long links or use a lower-density URL for codes printed small.\n\nBefore printing, always scan the code with two different phones from the distance people will actually stand. As a rule, the code should be at least one tenth as wide as the scanning distance: a code read from one metre away should be about 10 centimetres wide.",
  featureList: [
    "Static QR codes that never expire",
    "URL, Wi-Fi, vCard, text",
    "PNG and SVG download",
    "No tracking",
    "No sign-up",
  ],
  llmsLine:
    "QR Code Generator: create static QR codes (URL, Wi-Fi, vCard) that never expire, with PNG/SVG download and no tracking.",
  longTailVariants: [
    {
      slug: "wifi-qr-code-generator",
      keyword: "wifi qr code generator",
      h1: "Wi-Fi QR Code Generator",
      title: "Wi-Fi QR Code Generator – Free, Private | KlipKit",
      description:
        "Make a QR code guests can scan to join your Wi-Fi without typing the password. Created in your browser, so the password is never uploaded. Free, no sign-up.",
      intro:
        "Let guests join your Wi-Fi by pointing their camera at a code. This page opens the QR Code Generator in Wi-Fi mode. Your network password is encoded in your browser and never sent to KlipKit.",
      preset: { type: "wifi" },
      faqs: [
        {
          q: "Is it safe to put my Wi-Fi password in a QR code?",
          a: "It is as safe as writing the password on a card. Anyone who scans the code can read the password, so display it only where you trust visitors, or use a separate guest network. KlipKit creates the code in your browser, so the password is never sent to us.",
        },
      ],
    },
  ],
  relatedGuides: ["static-vs-dynamic-qr-codes", "how-to-print-qr-codes-that-scan"],
  locales: loc("qr-code-generator"),
  lastReviewed: "2026-11-02",
  reviewedBy: "founder",
};
