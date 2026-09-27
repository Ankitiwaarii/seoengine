import Link from "next/link";
export default function NotFound() {
  return (<><h1>Page not found</h1><p>We don&apos;t have listings for this yet. <Link href="/">Browse all categories</Link>.</p></>);
}
