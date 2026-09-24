import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "wazePOS — Aplikasi Kasir untuk Bisnis dan UMKM",
    short_name: "wazePOS",
    description:
      "Kelola transaksi, stok, produk, pelanggan, dan laporan bisnis secara lebih praktis bersama wazePOS.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#146b4f",
    lang: "id",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
