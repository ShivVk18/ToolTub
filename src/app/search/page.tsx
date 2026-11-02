import type { Metadata } from "next";
import { SearchResults } from "./SearchResults";
import { searchIndex } from "@/registry/search-index";

// Target of the WebSite SearchAction. noindex: search result pages are thin by definition.
export const metadata: Metadata = { title: "Search tools", robots: { index: false, follow: true } };

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-semibold">Search tools</h1>
      <SearchResults index={searchIndex} />
    </main>
  );
}
