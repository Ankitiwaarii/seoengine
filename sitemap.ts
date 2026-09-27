import type { MetadataRoute } from "next";
import { getCombos, getServices } from "@/lib/data";
import { url } from "@/lib/seo";

// Google's limit is 50,000 URLs per sitemap file; chunk below it.
export const PER_SITEMAP = 45000;
export const revalidate = 86400;

export async function allUrls(): Promise<MetadataRoute.Sitemap> {
  const [combos, services] = await Promise.all([getCombos(), getServices()]);
  const indexable = combos.filter((c) => c.indexable); // thin pages never enter the sitemap
  const cities = [...new Map(indexable.map((c) => [c.location.slug, c.location])).values()];
  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    ...services.map((s) => ({ url: url(`/${s.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...cities.map((l) => ({ url: url(`/cities/${l.slug}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...indexable.map((c) => ({ url: url(`/${c.service.slug}/${c.location.slug}`), lastModified: c.lastmod, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}

export async function generateSitemaps() {
  const n = Math.max(1, Math.ceil((await allUrls()).length / PER_SITEMAP));
  return Array.from({ length: n }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  return (await allUrls()).slice(id * PER_SITEMAP, (id + 1) * PER_SITEMAP);
}
