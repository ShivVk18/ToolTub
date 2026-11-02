import { describe, expect, it } from "vitest";
import { escapeWifi, vcardPayload, wifiPayload } from "@/lib/qr-payload";

describe("Wi-Fi QR payload", () => {
  it("escapes backslash, semicolon, comma, colon and quote", () => {
    expect(escapeWifi(String.raw`a\b;c,d:e"f`)).toBe(String.raw`a\\b\;c\,d\:e\"f`);
  });
  it("builds the standard WIFI: string", () => {
    expect(wifiPayload("Home;Net", "p@ss", "WPA")).toBe(String.raw`WIFI:T:WPA;S:Home\;Net;P:p@ss;;`);
  });
  it("omits the password for open networks", () => {
    expect(wifiPayload("Cafe", "ignored", "nopass")).toBe("WIFI:T:nopass;S:Cafe;P:;;");
  });
  it("returns empty without an SSID", () => {
    expect(wifiPayload("", "x", "WPA")).toBe("");
  });
});

describe("vCard payload", () => {
  it("skips empty fields", () => {
    expect(vcardPayload("Ana", "", "a@b.co")).toBe("BEGIN:VCARD\nVERSION:3.0\nFN:Ana\nEMAIL:a@b.co\nEND:VCARD");
  });
});
