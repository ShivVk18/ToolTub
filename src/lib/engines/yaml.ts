/** JSON ↔ YAML on top of the `yaml` package (loaded lazily by the caller, so other pages don't pay for it). */
import type * as YAMLNS from "yaml";

type Y = typeof YAMLNS;

/**
 * JSON value → YAML that reads back identically in both YAML 1.2 and 1.1 parsers. Strings that either version
 * would turn into something else ("yes", "on", "007", "1.0", "0o17", "~", dates…) are double-quoted, keys too.
 */
export function toYaml(Y: Y, value: unknown): string {
  const doc = new Y.Document(value);
  const misread = (s: string) => {
    for (const version of ["1.2", "1.1"] as const) {
      try {
        if (Y.parse(s, { version }) !== s) return true;
      } catch {
        return true;
      }
    }
    return false;
  };
  Y.visit(doc, {
    Scalar(_k, node) {
      if (typeof node.value === "string" && !node.value.includes("\n") && misread(node.value))
        node.type = "QUOTE_DOUBLE";
    },
  });
  return doc.toString({ lineWidth: 0 });
}

/** YAML → JSON value. Rejects duplicate keys and anchors that expand into huge documents ("billion laughs"). */
export function fromYaml(Y: Y, src: string): unknown {
  return Y.parse(src, { uniqueKeys: true, maxAliasCount: 100 });
}
