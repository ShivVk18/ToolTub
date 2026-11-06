"use client";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { ResultActions } from "@/components/tool/ToolChrome";
import { Field, ToolWorkspace, inputClass } from "@/components/tool/ToolWorkspace";
import type { Artifact } from "@/lib/store/klip";
import type { ToolProps } from "./types";
import { vcardPayload, wifiPayload } from "@/lib/qr-payload";

type Kind = "url" | "text" | "wifi" | "vcard";
const dataUrlToBlob = (u: string) => {
  const [head, b64] = u.split(",");
  return new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: head.slice(5, head.indexOf(";")) });
};

/** [Lib] QR Code Generator (qrcode, MIT). Static codes only: data lives in the code, nothing to expire. */
export function QrCodeGenerator({ slug, preset, next }: ToolProps) {
  const [kind, setKind] = useState<Kind>((preset?.type as Kind) ?? "url");
  const [f, setF] = useState({
    url: "https://klipkit.com",
    text: "",
    ssid: "",
    password: "",
    security: "WPA",
    name: "",
    phone: "",
    email: "",
  });
  const [fg, setFg] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const [ecl, setEcl] = useState<"L" | "M" | "Q" | "H">("M");
  const [lastPng, setPng] = useState<Blob | null>(null);
  const [lastSvg, setSvg] = useState("");

  const payload = useMemo(() => {
    if (kind === "url") return f.url.trim();
    if (kind === "text") return f.text;
    if (kind === "wifi") return wifiPayload(f.ssid, f.password, f.security as "WPA" | "WEP" | "nopass");
    return vcardPayload(f.name, f.phone, f.email);
  }, [kind, f]);

  useEffect(() => {
    if (!payload) return;
    const opts = { errorCorrectionLevel: ecl, margin: 4, color: { dark: fg, light: bg } };
    QRCode.toString(payload, { ...opts, type: "svg" }).then(setSvg);
    QRCode.toDataURL(payload, { ...opts, width: 1024 }).then((u) => setPng(dataUrlToBlob(u)));
  }, [payload, fg, bg, ecl]);

  const png = payload ? lastPng : null;
  const svg = payload ? lastSvg : "";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  const items: Artifact[] = png
    ? [
        { name: "qr-code.png", type: "image/png", blob: png },
        { name: "qr-code.svg", type: "image/svg+xml", blob: new Blob([svg], { type: "image/svg+xml" }) },
      ]
    : [];

  return (
    <ToolWorkspace
      status="idle"
      input={
        <div className="space-y-4">
          <div role="tablist" className="inline-flex rounded-lg bg-soft border border-line p-1 text-sm">
            {(["url", "text", "wifi", "vcard"] as Kind[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-md px-3 py-1.5 sm:min-h-0 sm:min-w-0 transition-colors ${
                  kind === k
                    ? "bg-solid text-ink font-medium shadow-sm border border-line"
                    : "text-ink2 hover:text-ink font-medium border border-transparent"
                }`}
              >
                {{ url: "Link", text: "Text", wifi: "Wi-Fi", vcard: "Contact" }[k]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {kind === "url" && (
              <Field label="URL">
                <input className={`${inputClass} w-80`} value={f.url} onChange={set("url")} inputMode="url" />
              </Field>
            )}
            {kind === "text" && (
              <Field label="Text">
                <input className={`${inputClass} w-80`} value={f.text} onChange={set("text")} />
              </Field>
            )}
            {kind === "wifi" && (
              <>
                <Field label="Network name (SSID)">
                  <input className={inputClass} value={f.ssid} onChange={set("ssid")} />
                </Field>
                <Field label="Password">
                  <input className={inputClass} value={f.password} onChange={set("password")} />
                </Field>
                <Field label="Security">
                  <select className={inputClass} value={f.security} onChange={set("security")}>
                    <option value="WPA">WPA/WPA2/WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None</option>
                  </select>
                </Field>
              </>
            )}
            {kind === "vcard" && (
              <>
                <Field label="Name">
                  <input className={inputClass} value={f.name} onChange={set("name")} />
                </Field>
                <Field label="Phone">
                  <input className={inputClass} value={f.phone} onChange={set("phone")} inputMode="tel" />
                </Field>
                <Field label="Email">
                  <input className={inputClass} value={f.email} onChange={set("email")} inputMode="email" />
                </Field>
              </>
            )}
          </div>
        </div>
      }
      advanced={
        <>
          <Field label="Colour">
            <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="h-10 w-16" />
          </Field>
          <Field label="Background">
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 w-16" />
          </Field>
          <Field label="Error correction">
            <select className={inputClass} value={ecl} onChange={(e) => setEcl(e.target.value as typeof ecl)}>
              <option value="L">L (7%)</option>
              <option value="M">M (15%)</option>
              <option value="Q">Q (25%)</option>
              <option value="H">H (30%, for logos)</option>
            </select>
          </Field>
        </>
      }
      result={
        // Reserve the code's space while it renders, so the content below doesn't jump (CLS was 0.082).
        payload && !svg ? (
          <div className="size-48 rounded-lg border border-border bg-muted" aria-hidden />
        ) : (
          svg && (
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
                alt="Your QR code"
                className="size-48 rounded-lg border border-border"
              />
              <div className="space-y-2">
                <p className="text-sm text-fg-muted">Static code · never expires · scan to test before printing</p>
                <ResultActions items={items} next={next} from={slug} separate />
              </div>
            </div>
          )
        )
      }
    />
  );
}
