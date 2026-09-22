import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  fallback: ["Segoe UI", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: "wazePOS — Aplikasi Kasir untuk Bisnis dan UMKM",
  description:
    "Kelola transaksi, stok, produk, pelanggan, dan laporan bisnis secara lebih praktis bersama wazePOS. Mulai uji coba gratis sekarang.",
  keywords: [
    "aplikasi kasir",
    "aplikasi kasir UMKM",
    "aplikasi POS",
    "software kasir",
    "aplikasi toko",
    "aplikasi kasir restoran",
    "aplikasi kasir coffee shop",
  ],
  openGraph: {
    title: "wazePOS — Kelola Kasir dan Operasional Bisnis dengan Mudah",
    description: "Satu aplikasi praktis untuk mengelola transaksi, stok, pelanggan, dan laporan bisnis Anda.",
    type: "website",
    locale: "id_ID",
    siteName: "wazePOS",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
  themeColor: "#146b4f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={manrope.variable} data-scroll-behavior="smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
