import { describe, it, expect } from "vitest";
import { matchOption, routeMessage, type RouteContext } from "@/lib/intent/chatRouter";
import { CARDS } from "@/lib/toolCards";
import { looksLikeContent } from "@/lib/engines/detect";
import { genParse } from "@/lib/engines/generators";
import { parse } from "@/lib/engines/intent";

const ctx = (over: Partial<RouteContext> = {}): RouteContext => ({
  card: null,
  cardIsLatest: false,
  hasFile: false,
  looksLikeContent,
  isGenerator: (t) => !!genParse(t),
  hasFileStep: (t) => parse(t, "pdf").steps.some((s) => s.ok),
  ...over,
});

describe("talk to the active card", () => {
  it("matches the spec's commands to options", () => {
    expect(matchOption("minify it", CARDS["json-formatter"].opts)?.[0]).toBe("Minify");
    expect(matchOption("4 spaces please", CARDS["json-formatter"].opts)?.[0]).toBe("4 spaces");
    expect(matchOption("decode", CARDS.base64.opts)?.[0]).toBe("Decode");
    expect(matchOption("give me 10", CARDS["uuid-generator"].opts)?.[0]).toBe("10");
    expect(matchOption("just 1", CARDS["uuid-generator"].opts)?.[0]).toBe("1");
    expect(matchOption("bold italic please", CARDS["social-post-formatter"].opts)?.[0]).toBe("Bold italic");
    expect(matchOption("3 paragraphs", CARDS["lorem-ipsum"].opts)?.[0]).toBe("3 ¶");
  });
  it("doesn't match numbers inside other words or unrelated text", () => {
    expect(matchOption("100 items", CARDS["uuid-generator"].opts)).toBeNull();
    expect(matchOption("hello there", CARDS["json-formatter"].opts)).toBeNull();
    expect(matchOption("anything", undefined)).toBeNull();
  });
});

describe("routing order", () => {
  const json = CARDS["json-formatter"];
  it("1 option command beats everything when a card is active and no file is loaded", () => {
    expect(routeMessage("minify it", ctx({ card: json }))).toEqual({ kind: "option", value: "m", label: "Minify" });
    // with a file loaded, words go to the file's plan instead
    expect(routeMessage("minify it", ctx({ card: json, hasFile: true })).kind).not.toBe("option");
  });
  it("2 content goes into the card only when the card is the latest message", () => {
    expect(routeMessage('{"a":1}', ctx({ card: json, cardIsLatest: true }))).toEqual({ kind: "intoCard" });
    expect(routeMessage('{"a":1}', ctx({ card: json, cardIsLatest: false }))).toEqual({ kind: "paste" });
    // generator cards have no input
    expect(routeMessage('{"a":1}', ctx({ card: CARDS["uuid-generator"], cardIsLatest: true }))).toEqual({
      kind: "paste",
    });
  });
  it("3 paste, open command, 4 generator, 5 file, 6 help", () => {
    expect(routeMessage('{"a":1}', ctx()).kind).toBe("paste");
    expect(routeMessage("open regex tester", ctx())).toEqual({ kind: "open", query: "regex tester" });
    expect(routeMessage("Show me the JWT decoder tool", ctx())).toEqual({ kind: "open", query: "JWT decoder" });
    expect(routeMessage("generate 10 uuids", ctx()).kind).toBe("gen");
    expect(routeMessage("protect it with a password", ctx({ hasFile: true })).kind).toBe("file");
    expect(routeMessage("what can you do", ctx()).kind).toBe("help");
  });
});
