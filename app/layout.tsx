import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/shared/pwa-register";
import { siteConfig } from "@/shared/config/site";

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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "wazePOS",
    statusBarStyle: "default",
  },
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
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
