import { ImageResponse } from "next/og";

export const alt = "wazePOS — Kelola Kasir dengan Lebih Mudah dan Teratur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: 76,
        color: "#15211d",
        background: "linear-gradient(135deg, #f4fcf7 0%, #dff6e9 100%)",
        fontFamily: "Arial",
      }}
    >
      <div style={{ width: "62%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 800 }}>
          <div style={{ width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, color: "white", background: "#147554" }}>w</div>
          <span>waze<span style={{ color: "#198760" }}>POS</span></span>
        </div>
        <div style={{ marginTop: 54, fontSize: 67, lineHeight: 1.06, fontWeight: 800, letterSpacing: -3 }}>Kelola kasir lebih mudah, bisnis lebih teratur.</div>
        <div style={{ marginTop: 27, color: "#53645c", fontSize: 25 }}>Transaksi, stok, pelanggan, dan laporan dalam satu aplikasi praktis.</div>
      </div>
      <div style={{ width: "38%", height: 385, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 34, color: "white", background: "linear-gradient(145deg, #198760, #0b503d)", boxShadow: "0 28px 60px rgba(11,80,61,.22)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><span style={{ fontSize: 145, lineHeight: 1, fontWeight: 900 }}>w</span><span style={{ marginTop: 25, fontSize: 21, opacity: .84, letterSpacing: 3 }}>JUAL. PANTAU. TUMBUH.</span></div>
      </div>
    </div>,
    size,
  );
}
