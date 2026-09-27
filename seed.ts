/**
 * Demo seed: 3 services × 24 Indian cities with generated listings.
 * This is placeholder data so the engine runs end-to-end. Replace it with
 * real data via `npm run sync` (see scripts/sync.ts) before going live.
 */
import "./env";
import { db, pool, listings, locations, pageOverrides, services as servicesT } from "../src/db";
import { slugify } from "../src/lib/slug";

const services = [
  { slug: "coworking-spaces", name: "Coworking Space", plural: "Coworking Spaces", description: "Shared, flexible desks and cabins for freelancers, startups and remote teams." },
  { slug: "meeting-rooms", name: "Meeting Room", plural: "Meeting Rooms", description: "Rooms you can book by the hour for client meetings, interviews and workshops." },
  { slug: "virtual-offices", name: "Virtual Office", plural: "Virtual Offices", description: "A registered business address, mail handling and GST registration support without renting a desk." },
];

// [name, state, lat, lng, population]
const cities: [string, string, number, number, number][] = [
  ["Mumbai", "Maharashtra", 19.076, 72.8777, 12442373],
  ["Pune", "Maharashtra", 18.5204, 73.8567, 3124458],
  ["Nagpur", "Maharashtra", 21.1458, 79.0882, 2405665],
  ["Nashik", "Maharashtra", 19.9975, 73.7898, 1486053],
  ["Delhi", "Delhi", 28.7041, 77.1025, 11034555],
  ["Bengaluru", "Karnataka", 12.9716, 77.5946, 8443675],
  ["Mysuru", "Karnataka", 12.2958, 76.6394, 920550],
  ["Mangaluru", "Karnataka", 12.9141, 74.856, 623841],
  ["Hyderabad", "Telangana", 17.385, 78.4867, 6993262],
  ["Chennai", "Tamil Nadu", 13.0827, 80.2707, 4646732],
  ["Coimbatore", "Tamil Nadu", 11.0168, 76.9558, 1050721],
  ["Madurai", "Tamil Nadu", 9.9252, 78.1198, 1017865],
  ["Kolkata", "West Bengal", 22.5726, 88.3639, 4496694],
  ["Ahmedabad", "Gujarat", 23.0225, 72.5714, 5577940],
  ["Surat", "Gujarat", 21.1702, 72.8311, 4467797],
  ["Vadodara", "Gujarat", 22.3072, 73.1812, 1670806],
  ["Jaipur", "Rajasthan", 26.9124, 75.7873, 3046163],
  ["Udaipur", "Rajasthan", 24.5854, 73.7125, 451100],
  ["Lucknow", "Uttar Pradesh", 26.8467, 80.9462, 2817105],
  ["Noida", "Uttar Pradesh", 28.5355, 77.391, 637272],
  ["Gurugram", "Haryana", 28.4595, 77.0266, 876969],
  ["Chandigarh", "Chandigarh", 30.7333, 76.7794, 960787],
  ["Kochi", "Kerala", 9.9312, 76.2673, 602046],
  ["Indore", "Madhya Pradesh", 22.7196, 75.8577, 1964086],
];

const amenityPool = ["High-speed Wi-Fi", "Power backup", "Parking", "24/7 access", "Cafeteria", "Printing", "Air conditioning", "Pet friendly", "Phone booths", "Metro nearby", "Projector", "Whiteboard", "Mail handling", "GST registration", "Reception desk", "Lockers"];
const prefixes = ["Hive", "Nest", "Loft", "Launch", "Anchor", "Spark", "Orbit", "Canvas", "Summit", "Harbor", "Pulse", "Grid", "Studio", "Foundry", "Commons"];
const suffixes = ["Works", "Hub", "Space", "Collective", "Labs", "House", "Point", "Base"];
const streets = ["MG Road", "Station Road", "Ring Road", "Park Street", "Main Road", "Tech Park", "Business Bay", "Civil Lines", "Market Road"];

// Deterministic RNG so every seed produces the same data
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

const priceBase: Record<string, [number, number]> = {
  "coworking-spaces": [4000, 18000], // per desk / month
  "meeting-rooms": [300, 2500],      // per hour
  "virtual-offices": [900, 4500],    // per month
};

export async function seed() {
  await db.delete(listings);
  await db.delete(pageOverrides);
  await db.delete(servicesT);
  await db.delete(locations);

  await db.insert(servicesT).values(services);
  await db.insert(locations).values(
    cities.map(([name, state, lat, lng, population]) => ({ name, state, stateSlug: slugify(state), slug: slugify(name), lat, lng, population })),
  );
  const svc = await db.select().from(servicesT).orderBy(servicesT.id);
  const loc = await db.select().from(locations).orderBy(locations.id);

  const rows: (typeof listings.$inferInsert)[] = [];
  for (const l of loc) {
    const sizeFactor = Math.log10(l.population); // bigger city → more listings
    for (const sv of svc) {
      // Some small cities deliberately end up thin, to show the quality gate working
      const count = Math.max(0, Math.round((sizeFactor - 5.4) * between(3, 7)) - (sv.slug === "meeting-rooms" ? 2 : 0));
      const [lo, hi] = priceBase[sv.slug];
      const cityPremium = l.population > 5_000_000 ? 1.35 : l.population > 2_000_000 ? 1.1 : 0.85;
      for (let i = 0; i < count; i++) {
        rows.push({
          externalId: `demo-${sv.slug}-${l.slug}-${i}`,
          name: `${pick(prefixes)} ${pick(suffixes)} ${l.name}`,
          address: `${between(1, 400)}, ${pick(streets)}, ${l.name}, ${l.state}`,
          rating: Math.round((3.4 + rand() * 1.6) * 10) / 10,
          reviewCount: between(4, 900),
          priceFrom: Math.round((between(lo, hi) * cityPremium) / 50) * 50,
          amenities: [...new Set(Array.from({ length: between(3, 7) }, () => pick(amenityPool)))],
          serviceId: sv.id,
          locationId: l.id,
        });
      }
    }
  }
  for (let i = 0; i < rows.length; i += 200) await db.insert(listings).values(rows.slice(i, i + 200));

  // Example editorial override on a high-value page
  const mumbai = loc.find((l) => l.slug === "mumbai")!;
  await db.insert(pageOverrides).values({
    serviceId: svc[0].id,
    locationId: mumbai.id,
    intro: "Mumbai's coworking scene clusters around BKC, Lower Parel and Andheri East. If you commute by local train, prioritise spaces within a 10-minute walk of a Western or Central line station.",
    faqs: [{ q: "Which Mumbai neighbourhood is best for startups?", a: "BKC and Lower Parel have the most investor and enterprise foot traffic; Andheri East is usually cheaper and closer to the airport." }],
  });

  console.log(`✓ Seeded ${svc.length} services, ${loc.length} locations, ${rows.length} listings (DEMO DATA — replace before launch).`);
}

// Run directly: npm run db:seed
if (process.argv[1]?.includes("seed")) seed().then(() => pool.end()).catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
