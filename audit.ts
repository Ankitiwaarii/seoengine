/**
 * Pre-launch quality audit: how many pages exist, which are indexable,
 * which are thin, and where data is missing. Run: npm run audit
 */
import "./env";
import { count, isNull } from "drizzle-orm";
import { db, pool, listings, locations, services } from "../src/db";

const MIN = Number(process.env.MIN_LISTINGS_TO_INDEX ?? 3);

async function main() {
  const groups = await db.select({ s: listings.serviceId, l: listings.locationId, n: count() }).from(listings).groupBy(listings.serviceId, listings.locationId);
  const svc = new Map((await db.select().from(services)).map((s) => [s.id, s.slug]));
  const loc = new Map((await db.select().from(locations)).map((l) => [l.id, l.slug]));
  const thin = groups.filter((g) => g.n < MIN);
  const [{ n: noPrice }] = await db.select({ n: count() }).from(listings).where(isNull(listings.priceFrom));
  const [{ n: noRating }] = await db.select({ n: count() }).from(listings).where(isNull(listings.rating));

  console.log(`
Possible combos:   ${svc.size * loc.size}   (${svc.size} services × ${loc.size} locations)
Pages with data:   ${groups.length}   (combos with 0 listings return 404)
Indexable (≥${MIN}):   ${groups.length - thin.length}
Thin → noindex:    ${thin.length}${thin.length ? "\n  " + thin.map((g) => `/${svc.get(g.s)}/${loc.get(g.l)} (${g.n})`).join("\n  ") : ""}
Listings missing price: ${noPrice}, missing rating: ${noRating}
`);
}
main().then(() => pool.end());
