"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ToolProps } from "./types";

const Loading = () => <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" aria-hidden />;
const lazy = (load: () => Promise<ComponentType<ToolProps>>) => dynamic(load, { loading: Loading });

/**
 * slug → lazily loaded tool UI. Each tool's code (and its worker/libraries) is a separate chunk,
 * so a visit to /json-formatter never downloads pdf-lib or the AI runtime.
 */
const components: Record<string, ComponentType<ToolProps>> = {
  "image-compressor": lazy(() => import("./ImageTool").then((m) => m.ImageCompressor)),
  "image-resizer": lazy(() => import("./ImageTool").then((m) => m.ImageResizer)),
  "image-converter": lazy(() => import("./ImageTool").then((m) => m.ImageConverter)),
  "heic-to-jpg": lazy(() => import("./HeicToJpg").then((m) => m.HeicToJpg)),
  "json-formatter": lazy(() => import("./JsonFormatter").then((m) => m.JsonFormatter)),
  "jwt-decoder": lazy(() => import("./JwtDecoder").then((m) => m.JwtDecoder)),
  "qr-code-generator": lazy(() => import("./QrCodeGenerator").then((m) => m.QrCodeGenerator)),
  "compress-pdf": lazy(() => import("./CompressPdf").then((m) => m.CompressPdf)),
  "pdf-to-word": lazy(() => import("./PdfToWord").then((m) => m.PdfToWord)),
  "background-remover": lazy(() => import("./BackgroundRemover").then((m) => m.BackgroundRemover)),
  "word-to-pdf": lazy(() => import("./PdfToWord").then((m) => m.WordToPdf)),
  "merge-pdf": lazy(() => import("./PdfTools").then((m) => m.MergePdf)),
  "split-pdf": lazy(() => import("./PdfTools").then((m) => m.SplitPdf)),
  "jpg-to-pdf": lazy(() => import("./PdfTools").then((m) => m.JpgToPdf)),
  "pdf-watermark": lazy(() => import("./PdfTools").then((m) => m.PdfWatermark)),
  "protect-pdf": lazy(() => import("./PdfTools").then((m) => m.ProtectPdf)),
  "organize-pdf": lazy(() => import("./PdfPages").then((m) => m.OrganizePdf)),
  "sign-pdf": lazy(() => import("./PdfPages").then((m) => m.SignPdf)),
  "pdf-to-jpg": lazy(() => import("./PdfPages").then((m) => m.PdfToJpg)),
};

export function ToolUI(props: ToolProps) {
  const C = components[props.slug];
  return C ? <C {...props} /> : <p className="text-sm text-fg-muted">This tool is coming soon.</p>;
}
