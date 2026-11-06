import { PageTitle } from "@/components/ui/PageTitle";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { people } from "@/registry/people";
import { ENTITY_DEFINITION } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/about",
  title: "About KlipKit – Who Builds It and How | KlipKit",
  description:
    "KlipKit is an independent, self-hosted collection of free online tools. Learn who builds it, how tools run on your device, and why there are no third parties.",
  ogImage: "/og/about.png",
  ogAlt: "About KlipKit – Who Builds It and How",
  index: true,
});

export default function About() {
  const f = people.founder;
  return (
    <main className="prose-klip mx-auto max-w-3xl space-y-6 px-4 py-12">
      <PageTitle>About KlipKit</PageTitle>
      <p>{ENTITY_DEFINITION}</p>
      <p>
        KlipKit is an independent service. Every tool runs either in your browser or on KlipKit&apos;s own servers. We
        use no third-party APIs, no outside AI providers and no external CDNs.
      </p>
      <h2 id="founder">{f.name}</h2>
      <p>
        {f.role}. {f.bio}
      </p>
    </main>
  );
}
