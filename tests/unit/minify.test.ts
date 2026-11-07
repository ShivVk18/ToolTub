import { describe, it, expect } from "vitest";
import { detectLang, minifyCss, minifyHtml } from "@/lib/engines/minify";

describe("detect language", () => {
  it("json, html, css, js", () => {
    expect(detectLang('{"a": 1}')).toBe("json");
    expect(detectLang("<div class='x'>hi</div>")).toBe("html");
    expect(detectLang("<!doctype html><html></html>")).toBe("html");
    expect(detectLang(".btn { color: red; }")).toBe("css");
    expect(detectLang("const a = { b: 1 };")).toBe("js");
    expect(detectLang("function f(){ return {a:1} }")).toBe("js");
  });
});

describe("CSS minifier", () => {
  it("removes comments and whitespace, keeps licences, strings and calc spacing", () => {
    const css = `/*! MIT licence */
/* a comment */
.btn , .a > .b {
  color : red ;
  content: "a  b";
  width: calc(100% - 2 * 10px);
  background: url( "x y.png" );
}
@media (max-width: 600px) { .btn { padding: 0 } }`;
    expect(minifyCss(css)).toBe(
      '/*! MIT licence */.btn,.a>.b{color:red;content:"a  b";width:calc(100% - 2 * 10px);background:url("x y.png")}@media (max-width:600px){.btn{padding:0}}',
    );
  });
  it("empty and comment-only input", () => {
    expect(minifyCss("")).toBe("");
    expect(minifyCss("/* nothing */")).toBe("");
  });
});

describe("HTML minifier", () => {
  it("collapses whitespace and comments; keeps pre/script byte-for-byte; minifies style", () => {
    const html = `<!doctype html>
<html>
  <head>
    <style> .a { color : red ; } </style>
  </head>
  <body>
    <!-- remove me -->
    <p>Hello   <b>world</b> !</p>
    <pre>  keep
   this  </pre>
    <script> if (a  <  b) {  } </script>
    <!--[if IE]>keep<![endif]-->
  </body>
</html>`;
    const out = minifyHtml(html);
    expect(out).toContain("<p>Hello <b>world</b> !</p>");
    expect(out).toContain("<pre>  keep\n   this  </pre>");
    expect(out).toContain("<script> if (a  <  b) {  } </script>");
    expect(out).toContain("<style>.a{color:red}</style>");
    expect(out).not.toContain("remove me");
    expect(out).toContain("<!--[if IE]>keep<![endif]-->");
    expect(out.startsWith("<!doctype html><html><head>")).toBe(true);
  });
});
