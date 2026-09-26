import { describe, expect, it } from "vitest";
import { marketingFaqs } from "@/shared/marketing/marketing-content";
import { getMarketingStructuredData, serializeJsonLd } from "@/shared/marketing/marketing-seo";
import { plans } from "@/shared/billing/plans";

describe("SEO landing page", () => {
  it("membentuk harga aplikasi dan FAQ dari sumber data internal", () => {
    const [application, faqPage] = getMarketingStructuredData("https://wazepos.example/path");

    expect(application.url).toBe("https://wazepos.example/");
    expect(application.offers).toEqual([
      expect.objectContaining({ name: "Paket Tumbuh", price: String(plans.tumbuh.annualPrice), priceCurrency: "IDR" }),
      expect.objectContaining({ name: "Paket Bisnis", price: String(plans.bisnis.annualPrice), priceCurrency: "IDR" }),
    ]);
    expect(faqPage.mainEntity).toHaveLength(marketingFaqs.length);
    expect(faqPage.mainEntity[0]).toEqual(
      expect.objectContaining({ name: marketingFaqs[0].question }),
    );
  });

  it("mengamankan karakter pembuka tag saat menyisipkan JSON-LD", () => {
    expect(serializeJsonLd({ value: "</script>" })).toBe('{"value":"\\u003c/script>"}');
  });
});
