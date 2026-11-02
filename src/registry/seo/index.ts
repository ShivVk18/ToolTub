import type { ToolSEO } from "../types";
import { compressPdf } from "./compress-pdf";
import { imageCompressor } from "./image-compressor";
import { heicToJpg } from "./heic-to-jpg";
import { jsonFormatter } from "./json-formatter";
import { jwtDecoder } from "./jwt-decoder";
import { backgroundRemover } from "./background-remover";
import { qrCodeGenerator } from "./qr-code-generator";

export const seoBySlug: Record<string, ToolSEO> = {
  "compress-pdf": compressPdf,
  "image-compressor": imageCompressor,
  "heic-to-jpg": heicToJpg,
  "json-formatter": jsonFormatter,
  "jwt-decoder": jwtDecoder,
  "background-remover": backgroundRemover,
  "qr-code-generator": qrCodeGenerator,
};
