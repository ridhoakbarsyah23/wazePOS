import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/forgot-password",
        "/inventory",
        "/login",
        "/onboarding",
        "/pos",
        "/products",
        "/register",
        "/reports",
        "/reset-password",
        "/sales/",
        "/settings",
        "/staff",
        "/subscription",
        "/transactions",
      ],
    },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}
