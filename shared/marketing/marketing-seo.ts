import { marketingFaqs } from "@/shared/marketing/marketing-content";
import { planIds, plans } from "@/shared/billing/plans";

const marketingDescription =
  "Kelola transaksi, stok, produk, pelanggan, dan laporan bisnis secara lebih praktis bersama wazePOS.";

export function getMarketingStructuredData(siteUrl: string) {
  const rootUrl = new URL("/", siteUrl).toString();

  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "wazePOS",
      description: marketingDescription,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: rootUrl,
      offers: planIds.map((planId) => ({
        "@type": "Offer",
        name: `Paket ${plans[planId].name}`,
        price: String(plans[planId].annualPrice),
        priceCurrency: "IDR",
        url: `${rootUrl}#harga`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: marketingFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ] as const;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
