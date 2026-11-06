import { ImageResponse } from "next/og";

/** Brand mark rendered at build time (manifest icons, Organization logo). */
export const brandIcon = (size: number) =>
  new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B0B0F",
        color: "#EDEDF0",
        fontSize: size * 0.55,
        fontWeight: 700,
        borderRadius: size * 0.2,
      }}
    >
      K
    </div>,
    { width: size, height: size },
  );
