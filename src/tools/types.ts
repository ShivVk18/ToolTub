import type { NextTool } from "@/components/workspace/ToolChrome";

export interface ToolProps {
  slug: string;
  /** Preset from a long-tail landing page, e.g. { targetKB: 100 }. */
  preset?: Record<string, string | number | boolean>;
  /** Compatible tools for "Send to next tool", computed on the server from the I/O contract. */
  next: NextTool[];
}
