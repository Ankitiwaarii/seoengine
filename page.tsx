import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCombos, getNearby, getPage, getSiblings, getStateStats } from "@/lib/data";
import { buildFaqs, buildIntro, buildStats, money } from "@/lib/content";
import { JsonLd, pageJsonLd, pageMeta } from "@/lib/seo";
import { MIN_LISTINGS, PRERENDER_LIMIT } from "@/lib/config";

type Params = { params: Promise<{ service: string; city: string }> };

// Prerender the biggest cities at build time; everything else renders on first
// request and is cached (ISR). Scales to 100k+ pages without 100k-page builds.
export const revalidate = 86400;
export const dynamicParams = true;
export async function generateStaticParams() {
  return (await getCombos())
    .filter((c) => c.indexable)
    .slice(0, PRERENDER_LIMIT)
    .map((c) => ({ service: c.service.slug, city: c.location.slug }));
}

async function load(params: Params["params"]) {
  const { service, city } = await params;
  const p = await getPage(service, city);
  if (!p) notFound(); // zero listings → no page at all, never an empty template
  const st = buildStats(p);
  const indexable = st.count >= MIN_LISTINGS && !p.override?.noindex;
  return { p, st, indexable };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { p, st, indexable } = await load(params);
  return pageMeta(p, st, indexable);
}

export default async function Page({ params }: Params) {
  const { p, st } = await load(params);
  const { service: s, location: l } = p;
  const [nearby, siblings, state] = await Promise.all([
    getNearby(s.id, l),
    getSiblings(l.id, s.id),
    getStateStats(s.id, l.stateSlug),
  ]);
  const faqs = buildFaqs(p, st);
  const updated = new Date(Math.max(...p.listings.map((x) => x.updatedAt.getTime())));

  return (
    <article>
      <JsonLd data={pageJsonLd(p, faqs)} />
      <nav className="crumbs"><Link href="/">Home</Link> › <Link href={`/${s.slug}`}>{s.plural}</Link> › {l.name}</nav>

      <h1>{st.count} Best {s.plural} in {l.name}</h1>
      <p className="lede">{buildIntro(p, st, state)}</p>
      {p.override?.intro && <p className="editorial">{p.override.intro}</p>}

      <div className="stats">
        {st.medianPrice != null && <div className="stat"><b>{money(st.medianPrice)}</b><span>median price{st.unit}</span></div>}
        {st.avgRating != null && <div className="stat"><b>{st.avgRating.toFixed(1)}★</b><span>average rating</span></div>}
        <div className="stat"><b>{st.totalReviews.toLocaleString("en-IN")}</b><span>reviews analysed</span></div>
        <div className="stat"><b>{st.count}</b><span>places compared</span></div>
      </div>

      <h2>Top-rated {s.plural.toLowerCase()} in {l.name}</h2>
      <ol className="list">
        {p.listings.map((x, i) => (
          <li className="item" key={x.id}>
            <h3><span className="rank">{i + 1}.</span>{x.url ? <a href={x.url} rel="nofollow noopener">{x.name}</a> : x.name}</h3>
            <div className="meta">
              {x.rating != null && <>{x.rating}★ ({x.reviewCount} reviews) · </>}
              {x.priceFrom != null && <>from {money(x.priceFrom)}{st.unit} · </>}
              {x.address}
            </div>
            <div className="tags">{x.amenities.map((a) => <span className="tag" key={a}>{a}</span>)}</div>
          </li>
        ))}
      </ol>

      {st.topAmenities.length > 0 && (
        <>
          <h2>What {s.plural.toLowerCase()} in {l.name} offer</h2>
          <div className="table-scroll"><table>
            <thead><tr><th>Amenity</th><th>Share of places</th></tr></thead>
            <tbody>{st.topAmenities.map((a) => <tr key={a.name}><td>{a.name}</td><td>{a.pct}%</td></tr>)}</tbody>
          </table></div>
        </>
      )}

      <h2>Frequently asked questions</h2>
      {faqs.map((f) => (<details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>))}

      {nearby.length > 0 && (
        <>
          <h2>{s.plural} near {l.name}</h2>
          <ul className="links">
            {nearby.map((n) => (<li key={n.location.id}><Link href={`/${s.slug}/${n.location.slug}`}>{s.plural} in {n.location.name}</Link><small>{n.count} places · {n.km} km away</small></li>))}
          </ul>
        </>
      )}

      {siblings.length > 0 && (
        <>
          <h2>More in {l.name}</h2>
          <ul className="links">
            {siblings.map((c) => (<li key={c.service.id}><Link href={`/${c.service.slug}/${l.slug}`}>{c.service.plural} in {l.name}</Link><small>{c.count} places</small></li>))}
            <li><Link href={`/cities/${l.slug}`}>Everything in {l.name}</Link><small>all categories</small></li>
          </ul>
        </>
      )}

      <p className="note" style={{ marginTop: 32 }}>
        Last updated {updated.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. Ranking = rating weighted by review count. Prices are the lowest published rate and may change.
      </p>
    </article>
  );
}
