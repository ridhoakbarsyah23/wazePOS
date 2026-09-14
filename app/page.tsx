import { MarketingPage } from "@/components/marketing-page";
import { getWhatsAppUrl, siteConfig } from "@/lib/site";

export default function Home() {
  return (
    <MarketingPage
      trialUrl={siteConfig.trialUrl}
      whatsappGeneralUrl={getWhatsAppUrl("general")}
      whatsappTrialUrl={getWhatsAppUrl("trial")}
      whatsappPricingUrl={getWhatsAppUrl("pricing")}
    />
  );
}
