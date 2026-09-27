import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <header className="site"><div className="wrap"><Link href="/">{SITE_NAME}</Link></div></header>
        <main className="wrap">{children}</main>
        <footer className="site"><div className="wrap">© {new Date().getFullYear()} {SITE_NAME}. Listings are refreshed from our data sources; prices may change.</div></footer>
      </body>
    </html>
  );
}
