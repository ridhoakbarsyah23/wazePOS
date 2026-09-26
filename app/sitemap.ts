import type { MetadataRoute } from "next";
import { siteConfig } from "@/shared/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteConfig.siteUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
}
