import { describe, expect, it } from "vitest";
import { parse, markHTML, RULES } from "@/lib/engines/intent";
import { kindOf, fmtSize, fmtDur, describe as describeFile, meta } from "@/lib/fileKind";

describe("fileKind utilities", () => {
  it("detects kind based on extension and mime type", () => {
    expect(kindOf("test.pdf", "application/pdf")).toBe("pdf");
    expect(kindOf("photo.jpg", "image/jpeg")).toBe("image");
    expect(kindOf("shot.png")).toBe("image");
    expect(kindOf("pic.webp")).toBe("image");
    expect(kindOf("apple.heic")).toBe("image");
    expect(kindOf("song.mp3", "audio/mpeg")).toBe("audio");
    expect(kindOf("voice.wav")).toBe("audio");
    expect(kindOf("clip.mp4", "video/mp4")).toBe("video");
    expect(kindOf("data.json")).toBe("data");
    expect(kindOf("table.csv")).toBe("data");
    expect(kindOf("doc.docx")).toBe("doc");
    expect(kindOf("archive.zip")).toBe("other");
  });

  it("formats file sizes accurately", () => {
    expect(fmtSize(500)).toBe("1 KB");
    expect(fmtSize(150_000)).toBe("150 KB");
    expect(fmtSize(2_400_000)).toBe("2.4 MB");
    expect(fmtSize(1_500_000_000)).toBe("1.5 GB");
  });

  it("formats durations accurately", () => {
    expect(fmtDur(45)).toBe("0:45");
    expect(fmtDur(65)).toBe("1:05");
    expect(fmtDur(1122)).toBe("18:42");
  });

  it("describes files with smart metadata", () => {
    expect(describeFile({ name: "doc.pdf", size: 12.4e6, type: "application/pdf", kind: "pdf", pages: 24 })).toBe(
      "a 24-page PDF, 12.4 MB",
    );
    expect(describeFile({ name: "shot.png", size: 2.1e6, type: "image/png", kind: "image", w: 1600, h: 1200 })).toBe(
      "a 1600 × 1200 photo, 2.1 MB",
    );
    expect(describeFile({ name: "test.json", size: 2.3e6, type: "application/json", kind: "data", lines: 41208 })).toBe(
      "a JSON file with 41,208 lines",
    );
  });

  it("generates meta tags for file cards", () => {
    expect(meta({ name: "doc.pdf", size: 12.4e6, type: "application/pdf", kind: "pdf", pages: 24 })).toBe(
      "24 pages · 12.4 MB",
    );
    expect(meta({ name: "shot.png", size: 2.1e6, type: "image/png", kind: "image", w: 1600, h: 1200 })).toBe(
      "1600 × 1200 · 2.1 MB",
    );
    expect(meta({ name: "song.mp3", size: 17e6, type: "audio/mpeg", kind: "audio", dur: 1122 })).toBe(
      "18:42 · 17.0 MB",
    );
    expect(meta({ name: "data.json", size: 2.3e6, type: "application/json", kind: "data", lines: 41208 })).toBe(
      "41,208 lines · 2.3 MB",
    );
  });
});

describe("intent parser (35 phrase cases)", () => {
  const cases: {
    phrase: string;
    kind?: Parameters<typeof parse>[1];
    expectedIds: string[];
    check?: (steps: ReturnType<typeof parse>["steps"]) => void;
  }[] = [
    // 1-5: Basic single actions
    {
      phrase: "compress it",
      kind: "pdf",
      expectedIds: ["compress"],
      check: (s) => expect(s[0].d).toBe("best balance"),
    },
    {
      phrase: "compress to under 2 mb",
      kind: "pdf",
      expectedIds: ["compress"],
      check: (s) => {
        expect(s[0].d).toBe("under 2 MB");
        expect(s[0].target).toBe(2e6);
      },
    },
    {
      phrase: "shrink to below 500 kb",
      kind: "image",
      expectedIds: ["compress"],
      check: (s) => {
        expect(s[0].d).toBe("under 500 KB");
        expect(s[0].target).toBe(5e5);
      },
    },
    {
      phrase: "reduce size to 1.5 gb",
      kind: "video",
      expectedIds: ["compress"],
      check: (s) => {
        expect(s[0].d).toBe("under 1.5 GB");
        expect(s[0].target).toBe(1.5e9);
      },
    },
    { phrase: "make it smaller", kind: "image", expectedIds: ["compress"] },

    // 6-10: PDF specific actions
    {
      phrase: "split pages 1-5",
      kind: "pdf",
      expectedIds: ["split"],
      check: (s) => {
        expect(s[0].d).toBe("pages 1–5");
        expect(s[0].a).toBe(1);
        expect(s[0].b).toBe(5);
      },
    },
    {
      phrase: "extract pages 3 to 8",
      kind: "pdf",
      expectedIds: ["split"],
      check: (s) => {
        expect(s[0].d).toBe("pages 3–8");
        expect(s[0].a).toBe(3);
        expect(s[0].b).toBe(8);
      },
    },
    { phrase: "pull out page 4", kind: "pdf", expectedIds: ["split"] },
    { phrase: "merge them into one", kind: "pdf", expectedIds: ["merge"] },
    { phrase: "combine these files", kind: "pdf", expectedIds: ["merge"] },

    // 11-15: Conversions
    { phrase: "convert to word", kind: "pdf", expectedIds: ["word"], check: (s) => expect(s[0].d).toBe(".docx") },
    { phrase: "save as docx", kind: "pdf", expectedIds: ["word"] },
    { phrase: "convert to pdf", kind: "doc", expectedIds: ["pdf"] },
    { phrase: "export as pdf", kind: "image", expectedIds: ["pdf"] },
    { phrase: "sign this document", kind: "pdf", expectedIds: ["sign"] },

    // 16-20: Security and Image tools
    { phrase: "add signature", kind: "pdf", expectedIds: ["sign"] },
    {
      phrase: "protect with password",
      kind: "pdf",
      expectedIds: ["protect"],
      check: (s) => expect(s[0].d).toBe("AES-256"),
    },
    { phrase: "encrypt with a password", kind: "pdf", expectedIds: ["protect"] },
    {
      phrase: "remove the background",
      kind: "image",
      expectedIds: ["bg"],
      check: (s) => expect(s[0].d).toBe("on-device model"),
    },
    { phrase: "cut out the subject", kind: "image", expectedIds: ["bg"] },

    // 21-25: Image resizing and formats
    { phrase: "no bg and optimize", kind: "image", expectedIds: ["bg", "compress"] },
    {
      phrase: "resize for instagram",
      kind: "image",
      expectedIds: ["resize"],
      check: (s) => expect(s[0].d).toBe("Instagram · 1080 × 1350"),
    },
    {
      phrase: "resize for youtube",
      kind: "video",
      expectedIds: ["resize"],
      check: (s) => expect(s[0].d).toBe("Youtube · 1080 × 1350"),
    },
    { phrase: "resize 1920x1080", kind: "image", expectedIds: ["resize"] },
    {
      phrase: "convert to webp",
      kind: "image",
      expectedIds: ["conv"],
      check: (s) => {
        expect(s[0].fmt).toBe("webp");
        expect(s[0].t).toBe("Convert to WEBP");
      },
    },

    // 26-30: Audio and Video operations
    { phrase: "save as png", kind: "image", expectedIds: ["conv"], check: (s) => expect(s[0].fmt).toBe("png") },
    { phrase: "convert to jpeg", kind: "image", expectedIds: ["conv"], check: (s) => expect(s[0].fmt).toBe("jpg") },
    { phrase: "make a gif", kind: "video", expectedIds: ["gif"] },
    { phrase: "extract the audio", kind: "video", expectedIds: ["audio"] },
    { phrase: "audio only please", kind: "video", expectedIds: ["audio"] },

    // 31-35: Transcriptions, trimming, and data formats
    {
      phrase: "transcribe it",
      kind: "audio",
      expectedIds: ["trans"],
      check: (s) => expect(s[0].d).toBe("on-device Whisper"),
    },
    { phrase: "generate subtitles srt", kind: "video", expectedIds: ["trans"] },
    {
      phrase: "trim 0:00 to 0:30",
      kind: "audio",
      expectedIds: ["trim"],
      check: (s) => expect(s[0].d).toBe("0:00 → 0:30"),
    },
    {
      phrase: "cut 1:15 - 2:45",
      kind: "video",
      expectedIds: ["trim"],
      check: (s) => expect(s[0].d).toBe("1:15 → 2:45"),
    },
    { phrase: "format and validate", kind: "data", expectedIds: ["fmt"] },
    { phrase: "beautify json", kind: "data", expectedIds: ["fmt"] },
    { phrase: "generate typescript types", kind: "data", expectedIds: ["types"] },
    { phrase: "minify it", kind: "data", expectedIds: ["min"] },

    // Multi-step complex chains
    {
      phrase: "compress to under 2 mb and split pages 1-5",
      kind: "pdf",
      expectedIds: ["compress", "split"],
      check: (s) => {
        expect(s[0].id).toBe("compress");
        expect(s[0].d).toBe("under 2 MB");
        expect(s[1].id).toBe("split");
        expect(s[1].d).toBe("pages 1–5");
      },
    },
    {
      phrase: "resize for instagram and convert to webp",
      kind: "image",
      expectedIds: ["resize", "conv"],
      check: (s) => {
        expect(s[0].id).toBe("resize");
        expect(s[1].id).toBe("conv");
        expect(s[1].fmt).toBe("webp");
      },
    },
    {
      phrase: "remove background, resize for instagram and compress to under 200 kb",
      kind: "image",
      expectedIds: ["bg", "resize", "compress"],
      check: (s) => {
        expect(s).toHaveLength(3);
        expect(s[0].id).toBe("bg");
        expect(s[1].id).toBe("resize");
        expect(s[2].id).toBe("compress");
        expect(s[2].d).toBe("under 200 KB");
      },
    },
  ];

  cases.forEach(({ phrase, kind, expectedIds, check }, idx) => {
    it(`Case ${idx + 1}: parses "${phrase}" for kind "${kind || "any"}"`, () => {
      const { steps } = parse(phrase, kind);
      const stepIds = steps.map((s) => s.id);
      for (const expectedId of expectedIds) {
        expect(stepIds).toContain(expectedId);
      }
      if (check) check(steps);
    });
  });

  it("flags inapplicable steps gracefully with ok=false", () => {
    const { steps } = parse("split pages 1-5", "audio");
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe("split");
    expect(steps[0].ok).toBe(false);
  });

  it("marks recognized phrases with markHTML", () => {
    const { spans } = parse("compress to under 2 mb and convert to webp", "image");
    const htmlMirror = markHTML("compress to under 2 mb and convert to webp", spans, true);
    expect(htmlMirror).toContain('<mark style="--hl:var(--h');
    const htmlUser = markHTML("compress to under 2 mb and convert to webp", spans, false);
    expect(htmlUser).toContain('<mark style="border-color:var(--u');
  });
});
