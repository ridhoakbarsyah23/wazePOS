import type { MetadataRoute } from "next";
import { siteConfig } from "@/shared/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/auth/continue",
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
