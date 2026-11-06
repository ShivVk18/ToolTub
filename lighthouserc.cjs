// Lighthouse CI, run locally against the production build (mobile emulation is Lighthouse's default).
// `npm run test:perf` builds, starts the standalone server on :3200 and audits these pages 3× each.
const base = "http://127.0.0.1:3200";
const indexable = [
  "/",
  "/image-compressor",
  "/heic-to-jpg",
  "/json-formatter",
  "/jwt-decoder",
  "/qr-code-generator",
  "/compress-image-to-50kb",
  "/heic-to-jpg-on-windows",
  "/wifi-qr-code-generator",
  "/image-tools",
  "/developer-tools",
];
const beta = ["/compress-pdf", "/background-remover", "/pdf-to-word"]; // noindex on purpose → SEO score not asserted

const perf = {
  "categories:performance": ["error", { minScore: 0.9 }],
  "categories:accessibility": ["error", { minScore: 0.95 }],
  "categories:best-practices": ["error", { minScore: 0.95 }],
  "largest-contentful-paint": ["error", { maxNumericValue: 2000 }],
  "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
  "total-blocking-time": ["warn", { maxNumericValue: 200 }], // lab proxy for INP
};

module.exports = {
  ci: {
    collect: {
      startServerCommand: "PORT=3200 node scripts/start-standalone.mjs",
      startServerReadyPattern: "Ready",
      url: [...indexable, ...beta].map((p) => base + p),
      numberOfRuns: 3,
      settings: { chromeFlags: "--no-sandbox --headless=new" },
    },
    assert: {
      assertMatrix: [
        { matchingUrlPattern: `^${base}/(compress-pdf|background-remover|pdf-to-word)$`, assertions: perf },
        {
          matchingUrlPattern: `^${base}/(?!compress-pdf$|background-remover$|pdf-to-word$).*`,
          assertions: { ...perf, "categories:seo": ["error", { minScore: 1 }] },
        },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};
