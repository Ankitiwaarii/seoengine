# Programmatic SEO engine (location pages)

Generates one useful, indexable page for every **service × city** combination in your database, like `/coworking-spaces/pune`. The pages come with metadata, structured data, sitemaps and internal links. It ships with demo data (3 workspace services × 24 Indian cities) so it runs end to end on your machine. Replace the demo data with your real data before you launch.

## Quick start (local)

You need Node 20.12+ and a MySQL or MariaDB database, either local or remote.

```bash
cp .env.example .env     # set DATABASE_URL to your database
npm install
npm run setup            # creates tables; loads demo data when SEED_DEMO=true
npm run audit            # shows which pages will be indexed vs. held back
npm run dev              # http://localhost:3000
```

## Deploying on Hostinger (Node.js web app)

1. **Create a database.** In hPanel, go to **Databases → MySQL Databases** and create a database and a user. Note the database name, the user and the password; Hostinger adds a `u123456789_` prefix to both names.
2. **Set environment variables.** In your Node.js app's deployment settings, add:
   - `DATABASE_URL = mysql://u123456789_user:PASSWORD@localhost:3306/u123456789_dbname`
   - `NEXT_PUBLIC_SITE_URL = https://your-domain.com`
   - `SEED_DEMO = true` for the first test deploy. Set it to `false` once you have real data.
   - `REVALIDATE_SECRET = ` any long random string
   - optional: `NEXT_PUBLIC_SITE_NAME`, `MIN_LISTINGS_TO_INDEX`, `PRERENDER_LIMIT`, `DB_POOL_SIZE`
   If the password contains special characters like `@ # / :`, URL-encode them. For example, `@` becomes `%40`.
3. **Set the build and start commands.** Build command: `npm run build`. Start command: `npm start`. Node version: 20 or 22.
   `npm run build` creates the tables automatically before building, so you never run a separate setup step on the server.
4. **Deploy.** The build log should show `✓ Tables ready` and then the Next.js build output.

**Troubleshooting.** `ER_ACCESS_DENIED` or `ECONNREFUSED` during the build means `DATABASE_URL` is wrong, or the env vars aren't reaching the build step. Check the prefixed user and database names, and keep `localhost` as the host. If you see `Too many connections`, lower `DB_POOL_SIZE` to 3.

## How it works

```
Data source (API / DB) ──npm run sync──▶ MySQL ──▶ Next.js templates ──▶ pages + sitemaps
                                          services × locations × listings
```

| Piece | File | What it does |
|---|---|---|
| Data model | `src/db/schema.ts` + `scripts/migrate.ts` | Services, locations, listings, plus optional editorial overrides (MySQL/MariaDB, pure-JS driver, so nothing to compile) |
| Page rules | `src/lib/data.ts` | Decides which pages exist: 0 listings → 404, fewer than `MIN_LISTINGS_TO_INDEX` → `noindex` and left out of the sitemap |
| Copy from data | `src/lib/content.ts` | Writes the intro and FAQs from the page's actual numbers: median price, comparison with the state average, top-rated listing, common amenities |
| SEO layer | `src/lib/seo.tsx` | Title, description, canonical, robots tag, and JSON-LD (BreadcrumbList, ItemList of LocalBusiness, FAQPage) |
| Money page | `src/app/[service]/[city]/page.tsx` | Ranked listings, stats, amenity table, FAQs, links to nearby cities and to other services in the same city |
| Hubs | `src/app/[service]`, `src/app/cities/[city]` | Keep every page within 2 clicks of the home page |
| Sitemaps | `src/app/sitemap.ts`, `robots.ts` | Split into chunks of 45k URLs, include only indexable pages, and set `lastmod` from the data |
| Scale | `PRERENDER_LIMIT` | Builds the top N pages at build time. The rest render on first visit and are cached (ISR, refreshed daily) |

## Plugging in your data

1. **Services.** Add rows to the `services` table: slug, name, plural and description. Set their price units in `PRICE_UNIT` in `src/lib/config.ts`.
2. **Listings.** Set `SOURCE_API_URL` and `SOURCE_API_KEY` in `.env`, then edit `mapItem()` in `scripts/adapters/rest.ts` to match your API's fields. After that, run:
   ```bash
   npm run sync              # upsert by externalId (safe to re-run)
   npm run sync -- --prune   # also remove listings that disappeared from the source
   ```
   For another source (Airtable, your own Postgres, a licensed places API), add an adapter that returns `SourceListing` objects and register it in `scripts/sync.ts`.
3. **Refresh pages.** Pages refresh daily on their own. To refresh right away, send
   `POST /api/revalidate?secret=$REVALIDATE_SECRET` (you can add `&path=/coworking-spaces/pune`).
4. **Editorial boost (optional).** Put a hand-written intro or extra FAQs, or force `noindex`, on any page through the `page_overrides` table. Use it on your 20–50 highest-value pages.

## After deploying

- **Run the data sync.** If your plan has SSH, run `npm run sync` from the app folder on the server. Otherwise, run it from your own computer against the same database: enable **Remote MySQL** in hPanel for your IP, then put the remote host in `DATABASE_URL` in your local `.env`. After a sync, call `/api/revalidate` so the pages update.
- **Search Console.** Submit `https://your-domain.com/sitemap/0.xml`. Then watch **Pages → "Crawled – currently not indexed"**. That report is the most useful quality signal you'll get.

## Rules that keep this on Google's good side

Google's scaled content abuse policy targets pages that are mass-produced with little value, not pages built from templates as such. Pages built from templates are fine when each one answers a real query with real data.

- **Launch with real data only.** The demo listings are fake. Never deploy them.
- **Keep the thin-page gate on.** A page with fewer than about 3 real listings can't beat a Google Maps result, so it shouldn't be indexed.
- **Don't spin text.** Swapping city names into generic paragraphs creates doorway pages. Every sentence in `content.ts` is computed from that page's data, so keep it that way.
- **Only mark up ratings you really have.** Only put `AggregateRating` in the structured data when the reviews come from a real source you're allowed to show.
- **Roll out gradually.** Launch a few hundred pages first. Check indexing and clicks in Search Console, then expand.
- **Track by template.** Group URLs by their `/[service]/` prefix in Search Console to see which templates earn clicks.
