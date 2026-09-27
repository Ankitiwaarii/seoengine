import Link from "next/link";
import { getCombos, getServices } from "@/lib/data";
import { SITE_NAME } from "@/lib/config";

export const revalidate = 86400;

export default async function Home() {
  const [services, combos] = await Promise.all([getServices(), getCombos()]);
  return (
    <>
      <h1>Find the right workspace in any Indian city</h1>
      <p className="lede">{SITE_NAME} compares {combos.reduce((s, c) => s + c.count, 0).toLocaleString("en-IN")} places across {new Set(combos.map((c) => c.location.id)).size} cities, ranked by real reviews and prices.</p>
      {services.map((s) => {
        const top = combos.filter((c) => c.service.id === s.id && c.indexable).slice(0, 12);
        return (
          <section key={s.id}>
            <h2><Link href={`/${s.slug}`}>{s.plural}</Link></h2>
            <p className="note">{s.description}</p>
            <ul className="links">
              {top.map((c) => (<li key={c.location.id}><Link href={`/${s.slug}/${c.location.slug}`}>{s.plural} in {c.location.name}</Link><small>{c.count} places</small></li>))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
