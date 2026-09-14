import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        color: "white",
        background: "linear-gradient(145deg, #23a473, #106348)",
        fontSize: 39,
        fontWeight: 900,
      }}
    >
      w
    </div>,
    size,
  );
}
