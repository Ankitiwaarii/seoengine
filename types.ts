/** What every data-source adapter must return. The sync script handles the rest. */
export interface SourceListing {
  externalId: string;      // stable id from the source, used for idempotent upserts
  serviceSlug: string;     // must match a Service.slug
  city: string;            // "Pune"
  state: string;           // "Maharashtra"
  lat?: number;
  lng?: number;
  name: string;
  address: string;
  rating?: number | null;
  reviewCount?: number;
  priceFrom?: number | null;
  url?: string | null;
  phone?: string | null;
  amenities?: string[];
}

export interface Adapter {
  name: string;
  fetchAll(): AsyncGenerator<SourceListing>;
}
