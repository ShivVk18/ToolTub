import { PageTitle } from "@/components/ui/PageTitle";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  path: "/privacy",
  title: "Privacy – How KlipKit Handles Your Files | KlipKit",
  description:
    "How KlipKit handles files: most tools run on your device and never upload anything. Server tools use our own servers and delete files within one hour.",
  ogImage: "/og/privacy.png",
  ogAlt: "Privacy – How KlipKit Handles Your Files",
  index: true,
});

export default function Privacy() {
  return (
    <main className="prose-klip mx-auto max-w-3xl space-y-6 px-4 py-12">
      <PageTitle>Privacy, in plain language</PageTitle>
      <h2>Tools that run on your device</h2>
      <p>
        Most KlipKit tools say “Runs on your device — nothing uploaded”. Your files are processed by code running in
        your browser. They are never sent to KlipKit or anyone else.
      </p>
      <h2>Tools that use KlipKit&apos;s own server</h2>
      <p>
        A few tools, such as PDF to Word, say “Processed on KlipKit&apos;s own server”. Your file goes to a server we
        run ourselves, is converted in an isolated container with no internet access, and is deleted automatically
        within one hour. No third party ever receives it.
      </p>
      <h2>What we record</h2>
      <p>
        Anonymous page and tool counts through self-hosted Umami (no cookies). We do not log file names, file contents
        or IP addresses beyond short-lived rate-limit counters.
      </p>
      <h2>Accounts and cookies</h2>
      <p>There are no accounts. Favourites and recently used tools are stored in your browser&apos;s local storage.</p>
    </main>
  );
}
