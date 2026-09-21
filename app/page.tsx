import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing-page";
import { getMarketingStructuredData, serializeJsonLd } from "@/lib/marketing-seo";
import { getWhatsAppUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "wazePOS — Kelola Kasir dan Operasional Bisnis dengan Mudah",
    description: "Satu aplikasi praktis untuk mengelola transaksi, stok, pelanggan, dan laporan bisnis Anda.",
    type: "website",
    locale: "id_ID",
    siteName: "wazePOS",
    url: "/",
  },
};

export default function Home() {
  const structuredData = getMarketingStructuredData(siteConfig.siteUrl);

  return (
    <>
      {structuredData.map((data) => (
        <script
          key={data["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
        />
      ))}
      <MarketingPage
        trialUrl={siteConfig.trialUrl}
        whatsappGeneralUrl={getWhatsAppUrl("general")}
        whatsappTrialUrl={getWhatsAppUrl("trial")}
      />
    </>
  );
}
