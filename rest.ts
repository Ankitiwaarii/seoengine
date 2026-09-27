/**
 * Generic paginated REST adapter.
 * Expects GET {SOURCE_API_URL}?page=N to return { items: [...], nextPage: number|null }.
 * Edit `mapItem` to match the fields your API actually returns.
 */
import type { Adapter, SourceListing } from "./types";

function mapItem(it: any): SourceListing {
  return {
    externalId: String(it.id),
    serviceSlug: it.category,
    city: it.city,
    state: it.state,
    lat: it.lat,
    lng: it.lng,
    name: it.name,
    address: it.address,
    rating: it.rating ?? null,
    reviewCount: it.review_count ?? 0,
    priceFrom: it.price_from ?? null,
    url: it.website ?? null,
    phone: it.phone ?? null,
    amenities: it.amenities ?? [],
  };
}

export const restAdapter: Adapter = {
  name: "rest",
  async *fetchAll() {
    const base = process.env.SOURCE_API_URL;
    if (!base) throw new Error("Set SOURCE_API_URL in .env");
    let page: number | null = 1;
    while (page) {
      const url = new URL(base);
      url.searchParams.set("page", String(page));
      const res = await fetch(url, {
        headers: process.env.SOURCE_API_KEY ? { Authorization: `Bearer ${process.env.SOURCE_API_KEY}` } : {},
      });
      if (!res.ok) throw new Error(`Source API ${res.status}: ${await res.text()}`);
      const body: { items: any[]; nextPage: number | null } = await res.json();
      for (const it of body.items) yield mapItem(it);
      page = body.nextPage;
      await new Promise((r) => setTimeout(r, 250)); // be polite to the API
    }
  },
};
