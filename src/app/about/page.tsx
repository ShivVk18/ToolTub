import type { Metadata } from "next";
import { people } from "@/registry/people";
import { ENTITY_DEFINITION } from "@/lib/site";

export const metadata: Metadata = { title: "About KlipKit", description: ENTITY_DEFINITION, alternates: { canonical: "/about" } };

export default function About() {
  const f = people.founder;
  return (
    <main className="prose-klip mx-auto max-w-3xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">About KlipKit</h1>
      <p>{ENTITY_DEFINITION}</p>
      <p>KlipKit is an independent service. Every tool runs either in your browser or on KlipKit&apos;s own servers. We use no third-party APIs, no outside AI providers and no external CDNs.</p>
      <h2 id="founder">{f.name}</h2>
      <p>{f.role}. {f.bio}</p>
    </main>
  );
}
