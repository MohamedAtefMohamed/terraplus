import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/map", label: "Map" },
  { href: "/analysis", label: "Analysis" },
  { href: "/timeline", label: "Timeline" },
  { href: "/insights", label: "Insights" },
  { href: "/methodology", label: "Methodology" },
];

const sources = [
  { href: "https://science.nasa.gov/mission/nisar/", label: "NASA NISAR mission" },
  { href: "https://nisar-docs.asf.alaska.edu/", label: "NISAR product documentation" },
  { href: "https://search.asf.alaska.edu/", label: "ASF DAAC search" },
  { href: "https://science.nasa.gov/mission/nisar/sample-data/", label: "NISAR sample data" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/80 bg-background-soft/60">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr_1.2fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-sm text-xs leading-relaxed text-muted">
              TerraPulse is a demonstration Earth Surface Intelligence Platform built for the
              NASA Space Apps Challenge. It explores how NISAR-style SAR observations can be turned
              into understandable surface-change insights.
            </p>
            <p className="max-w-sm rounded-md border border-amber/20 bg-amber/[0.05] px-3 py-2 font-mono text-[11px] leading-relaxed tracking-wide text-amber/90">
              DEMO DATASET · Synthetic radar backscatter with real coordinates. Not a NISAR
              acquisition. Not for operational or safety decisions.
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Platform</p>
            <ul className="mt-4 grid gap-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-strong transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Data & attribution
            </p>
            <ul className="mt-4 grid gap-2">
              {sources.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-strong transition-colors hover:text-accent"
                  >
                    {source.label}
                    <ExternalLink className="size-3 opacity-60" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              Basemap imagery: Esri World Imagery (Esri, Maxar, Earthstar Geographics) and CARTO.
              Map data © OpenStreetMap contributors. Optional live metadata: ASF DAAC / NASA CMR.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line/70 pt-5 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TerraPulse · NASA Space Apps Challenge</p>
          <p className="font-mono uppercase tracking-[0.14em]">
            Built for understanding, not for emergency response
          </p>
        </div>
      </div>
    </footer>
  );
}