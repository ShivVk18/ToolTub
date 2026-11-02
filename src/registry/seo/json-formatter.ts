import type { ToolSEO } from "../types";
import { loc } from "./shared";

export const jsonFormatter: ToolSEO = {
  primaryKeyword: "json formatter",
  secondaryKeywords: ["json validator", "json beautifier", "json pretty print", "json minify", "format json online"],
  searchIntent: "do",
  title: "JSON Formatter & Validator – Beautify JSON | KlipKit",
  description: "Format, validate and minify JSON in your browser. Exact error line and column, tree view and copy. Private: your JSON never leaves your device. Free.",
  ogTitle: "JSON Formatter & Validator — private, instant",
  ogDescription: "Beautify, validate and minify JSON locally. Exact error locations, no upload.",
  ogAlt: "KlipKit JSON Formatter highlighting a missing comma on line 12",
  h1: "JSON Formatter & Validator",
  answerQuestion: "How do I format and validate JSON online safely?",
  answerSummary:
    "Paste your JSON into KlipKit's JSON Formatter and it is formatted and validated instantly. Invalid JSON shows the exact line and column of the error with a plain-English fix. Everything runs in your browser, so API responses, tokens and customer data are never sent to a server. It is free with no sign-up.",
  keyFacts: [
    "Formats, validates and minifies JSON as you type",
    "Errors show line, column and a human-readable cause",
    "Indent with 2 spaces, 4 spaces or tabs; optional key sorting",
    "Handles files up to 50 MB in a background worker",
    "Processing: entirely in your browser; nothing is uploaded or logged",
    "Cost: free, no account",
  ],
  howToSteps: [
    { name: "Paste or drop JSON", text: "Paste JSON, drop a .json file, or click Sample to try it." },
    { name: "Choose format or minify", text: "Pick indentation and click Format, or click Minify for a compact single line." },
    { name: "Copy or download", text: "Copy the result or download it as a .json file." },
  ],
  totalTime: "PT10S",
  faqs: [
    {
      q: "Is it safe to paste JSON into an online formatter?",
      a: "It is safe only if the formatter runs in your browser. KlipKit formats and validates JSON locally with JavaScript and never sends it to a server, so API keys and personal data stay on your machine. Check any tool by opening the browser's network tab while you paste.",
    },
    {
      q: "Why is my JSON invalid?",
      a: "The most common causes are a trailing comma after the last item, single quotes instead of double quotes, unquoted keys, and comments, none of which standard JSON allows. KlipKit points to the exact line and column and explains the problem, so you can fix it in seconds.",
    },
    {
      q: "What is the difference between formatting and minifying JSON?",
      a: "Formatting adds line breaks and indentation so people can read the structure. Minifying removes all unnecessary whitespace so the JSON is as small as possible for sending over a network or storing. Both produce exactly the same data; only whitespace changes.",
    },
    {
      q: "Can KlipKit format very large JSON files?",
      a: "Yes. Files up to about 50 MB are parsed in a background worker so the page stays responsive. Very large files may take a few seconds on older laptops or phones. For files above 50 MB, a command-line tool such as jq is usually a better choice.",
    },
    {
      q: "Does KlipKit support JSON with comments (JSONC) or JSON5?",
      a: "The validator follows the strict JSON standard (RFC 8259), so comments and trailing commas are reported as errors. That matches what APIs and JSON.parse accept. Use the Strip comments option to remove comments automatically before formatting configuration files such as tsconfig.json.",
    },
    {
      q: "How do I convert JSON to YAML, CSV or TypeScript?",
      a: "Click Send to next tool after formatting and choose JSON to YAML, JSON to CSV, or JSON to TypeScript. Your JSON moves across without copying and pasting, and stays in your browser. Each converter also works on its own if you paste JSON directly.",
    },
  ],
  comparisonTable: {
    caption: "KlipKit vs typical online JSON tools",
    headers: ["", "KlipKit", "Typical JSON site"],
    rows: [
      ["Where JSON is processed", "In your browser", "Often sent to a server"],
      ["Error location", "Line, column and plain-English cause", "Generic parse error"],
      ["Ads", "None near the editor", "Banners around the editor"],
      ["Large files", "Up to 50 MB in a worker", "Page freezes"],
    ],
  },
  explainer:
    "JSON (JavaScript Object Notation) is a text format for structured data, used by almost every web API. It allows objects in braces, arrays in brackets, strings in double quotes, numbers, true, false and null, and nothing else.\n\nFormat JSON when you need to read an API response, debug a configuration file or review data in a pull request. Minify it before sending it over the network or embedding it in code.\n\nCommon mistakes: copying JSON from logs that includes escaped quotes; pasting JavaScript objects, which allow single quotes and unquoted keys, and expecting them to be valid JSON; and pasting production secrets into formatters that send data to a server. KlipKit's formatter never does, because it has no server component.\n\nWhen JSON fails to parse, read the error position first: the real mistake is usually just before it, such as a missing comma at the end of the previous line. Formatting large responses also makes code review easier, because each key sits on its own line and changes show up clearly in a diff.",
  featureList: ["Format and minify JSON", "Exact error line and column", "Tree view", "Processed in your browser", "No sign-up"],
  llmsLine: "JSON Formatter & Validator: format, validate and minify JSON locally in the browser with exact error locations.",
  relatedGuides: ["common-json-errors-and-how-to-fix-them", "json-vs-yaml"],
  locales: loc("json-formatter"),
  lastReviewed: "2026-11-02",
  reviewedBy: "founder",
};
