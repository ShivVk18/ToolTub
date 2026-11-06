/** Payload builders for static QR codes. Wi-Fi format escapes \ ; , : and " with a backslash. */
export const escapeWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

export const wifiPayload = (ssid: string, password: string, security: "WPA" | "WEP" | "nopass") =>
  ssid ? `WIFI:T:${security};S:${escapeWifi(ssid)};P:${security === "nopass" ? "" : escapeWifi(password)};;` : "";

export const vcardPayload = (name: string, phone: string, email: string) =>
  name
    ? ["BEGIN:VCARD", "VERSION:3.0", `FN:${name}`, phone && `TEL:${phone}`, email && `EMAIL:${email}`, "END:VCARD"]
        .filter(Boolean)
        .join("\n")
    : "";
