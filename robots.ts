import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { allUrls, PER_SITEMAP } from "./sitemap";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const n = Math.max(1, Math.ceil((await allUrls()).length / PER_SITEMAP));
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: Array.from({ length: n }, (_, i) => `${SITE_URL}/sitemap/${i}.xml`),
  };
}
