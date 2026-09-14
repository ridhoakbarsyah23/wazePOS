export const siteConfig = {
  name: "wazePOS",
  tagline: "Jual. Pantau. Tumbuh.",
  trialUrl: process.env.NEXT_PUBLIC_TRIAL_URL?.trim() || "/login",
  whatsappNumber: "6281390277240",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
};

export type WhatsAppContext = "general" | "trial" | "pricing";

const whatsappMessages: Record<WhatsAppContext, string> = {
  general: "Halo tim wazePOS, saya ingin memperoleh informasi lebih lanjut mengenai wazePOS.",
  trial: "Halo tim wazePOS, saya tertarik mengikuti uji coba gratis wazePOS dan ingin memperoleh informasi lebih lanjut.",
  pricing: "Halo tim wazePOS, saya ingin memperoleh informasi mengenai paket dan harga wazePOS.",
};

export function getWhatsAppUrl(context: WhatsAppContext = "general") {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(whatsappMessages[context])}`;
}
