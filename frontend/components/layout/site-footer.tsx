import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const platform = [
  { href: "/map", label: "Earth Explorer" },
  { href: "/live", label: "Change Analysis" },
  { href: "/timeline", label: "Timeline" },
  { href: "/insights", label: "Interpretation" },
  { href: "/dashboard", label: "Console" },
];

const reference = [
  { href: "/missions", label: "Data & Missions" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
];

const sources = [
  { href: "https://science.nasa.gov/mission/nisar/", label: "NASA NISAR mission" },
  { href: "https://search.asf.alaska.edu/", label: "ASF DAAC search" },
  { href: "https://nisar-docs.asf.alaska.edu/", label: "NISAR product documentation" },
  { href: "https://earth-search.aws.element84.com/v1", label: "Element 84 Earth Search" },
  { href: "https://registry.opendata.aws/sentinel-1/", label: "AWS Open Data · Sentinel-1" },
  { href: "https://gibs.earthdata.nasa.gov/", label: "NASA GIBS imagery" },
  {
    href: "https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/?tab=resources",
    label: "Space Apps 2026 challenge & resources",
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line/80 bg-background-soft/50">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1.4fr]">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-sm text-xs leading-relaxed text-muted">
              TerraPulse is an Earth-observation intelligence platform built for the NASA Space
              Apps Challenge. It reads the NISAR catalogue from ASF, measures change on real
              Sentinel-1 scenes, and presents every result with its sources and limits.
            </p>
            <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald">
              <span className="size-1.5 rounded-full bg-emerald" />
              live data pipeline
            </p>
          </div>

          <div>
            <p className="tech-label">Platform</p>
            <ul className="mt-4 grid gap-2">
              {platform.map((link) => (
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
            <p className="tech-label">Reference</p>
            <ul className="mt-4 grid gap-2">
              {reference.map((link) => (
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
            <p className="tech-label">Data sources</p>
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
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line/70 pt-5 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono uppercase tracking-[0.14em]">
            © 2026 TerraPulse · NASA Space Apps Challenge
          </p>
          <p className="font-mono uppercase tracking-[0.14em]">
            Next.js · FastAPI · MapLibre · Rasterio · Sentinel-1 C-band
          </p>
          <p className="font-mono uppercase tracking-[0.14em]">
            Screening signals · not an operational product
          </p>
        </div>
      </div>
    </footer>
  );
}