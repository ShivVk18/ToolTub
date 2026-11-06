import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { deps, platformDeps } from "@/registry/dependencies";

export const metadata: Metadata = pageMetadata({
  path: "/licences",
  title: "Open-Source Licences – Libraries and Models | KlipKit",
  description:
    "Every open-source library and on-device AI model KlipKit uses, with its licence and download size. All self-hosted on klipkit.com with no third-party CDNs.",
  ogImage: "/og/licences.png",
  ogAlt: "Open-Source Licences – Libraries and Models",
  index: true,
});

export default function Licences() {
  const rows = [...Object.values(deps), ...platformDeps];
  return (
    <main className="prose-klip mx-auto max-w-4xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">Open-source licences</h1>
      <p>
        KlipKit is built in-house on these open-source projects. All of them are served from klipkit.com; none makes a
        network call to a third party. LGPL components are loaded as separate files so they can be replaced.
      </p>
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Licence</th>
            <th>Download size</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.name}>
              <td>
                <a href={d.url}>{d.name}</a>
              </td>
              <td>{d.licence}</td>
              <td>
                {d.sizeKb
                  ? `≈ ${d.sizeKb >= 1000 ? `${(d.sizeKb / 1000).toFixed(0)} MB` : `${d.sizeKb} KB`}`
                  : "server / build only"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
