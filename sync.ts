/**
 * Pulls listings from a data source and upserts them into the database.
 *   npm run sync                    → REST adapter (scripts/adapters/rest.ts)
 *   npm run sync -- --prune         → also deletes listings no longer in the source
 *   npm run sync -- --source=myapi  → use another registered adapter
 * Then ping /api/revalidate (or wait for ISR) so pages pick up the changes.
 */
import "./env";
import { eq, notInArray } from "drizzle-orm";
import { db, pool, listings, locations, services } from "../src/db";
import { slugify } from "../src/lib/slug";
import { restAdapter } from "./adapters/rest";
import type { Adapter } from "./adapters/types";

const adapters: Record<string, Adapter> = { rest: restAdapter };

async function main() {
  const name = process.argv.find((a) => a.startsWith("--source="))?.split("=")[1] ?? "rest";
  const prune = process.argv.includes("--prune");
  const adapter = adapters[name];
  if (!adapter) throw new Error(`Unknown adapter "${name}". Options: ${Object.keys(adapters).join(", ")}`);

  const svcMap = new Map((await db.select().from(services)).map((s) => [s.slug, s.id]));
  const locCache = new Map<string, number>();
  const seen: string[] = [];
  let upserts = 0, skipped = 0;

  for await (const it of adapter.fetchAll()) {
    const serviceId = svcMap.get(it.serviceSlug);
    if (!serviceId || !it.city || !it.name || !it.externalId) { skipped++; continue; }

    const locSlug = slugify(it.city);
    let locationId = locCache.get(locSlug);
    if (!locationId) {
      const [existing] = await db.select({ id: locations.id }).from(locations).where(eq(locations.slug, locSlug));
      locationId = existing?.id ?? (await db.insert(locations).values({
        slug: locSlug, name: it.city, state: it.state, stateSlug: slugify(it.state), lat: it.lat ?? 0, lng: it.lng ?? 0,
      }).$returningId())[0].id;
      locCache.set(locSlug, locationId);
    }

    const data = {
      name: it.name, address: it.address, rating: it.rating ?? null, reviewCount: it.reviewCount ?? 0,
      priceFrom: it.priceFrom ?? null, url: it.url ?? null, phone: it.phone ?? null,
      amenities: it.amenities ?? [], serviceId, locationId, updatedAt: new Date(),
    };
    await db.insert(listings).values({ externalId: it.externalId, ...data }).onDuplicateKeyUpdate({ set: data });
    seen.push(it.externalId);
    upserts++;
  }

  if (prune && seen.length) {
    const [res] = await db.delete(listings).where(notInArray(listings.externalId, seen));
    console.log(`Pruned ${res.affectedRows} stale listings.`);
  }
  console.log(`Synced ${upserts} listings (${skipped} skipped: unknown service or missing fields).`);
}

main().then(() => pool.end()).catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
