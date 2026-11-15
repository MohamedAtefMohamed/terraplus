import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleDot,
  Database,
  GitCompareArrows,
  HardDriveDownload,
  Layers3,
  Radar,
  Satellite,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BriefingFilm } from "@/components/landing/briefing-film";
import { IntelligenceOverview } from "@/components/landing/intelligence-overview";
import { LiveNisarFeed } from "@/components/landing/live-nisar-feed";
import { OrbitalHero } from "@/components/landing/orbital-hero";
import { ScenarioCards } from "@/components/landing/scenario-cards";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-2xl space-y-2.5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.9rem]">
        {title}
      </h2>
      {body ? <p className="text-sm leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}

const CAPABILITIES = [
  {
    icon: Satellite,
    title: "NISAR catalogue",
    body: "The ASF DAAC search API returns recent NISAR granules with orbit direction, track, frame, product level, and the official browse quick-look. Browsing needs no account.",
    points: ["ASF search API", "Browse imagery from NASA Earthdata Cloud", "RSLC, GSLC, GCOV products"],
  },
  {
    icon: GitCompareArrows,
    title: "Change comparison",
    body: "Two Sentinel-1 GRD scenes on the same track and polarisation are paired, read through cloud-optimized GeoTIFF windows, and compared in decibels after a 3×3 speckle screen.",
    points: ["IW and EW modes", "Otsu water threshold", "GeoJSON change patches"],
  },
  {
    icon: Layers3,
    title: "Geospatial workspace",
    body: "Footprints, monitoring areas, and vector change patches render in MapLibre. NASA GIBS supplies a current optical basemap; radar layers sit on top.",
    points: ["MapLibre GL", "NASA GIBS imagery", "Deep links per area"],
  },
];

const PIPELINE = [
  { step: "01", title: "Data acquisition", body: "ASF catalogue and Sentinel-1 STAC queries." },
  { step: "02", title: "Preprocessing", body: "Decimated windowed reads, no full-scene download." },
  { step: "03", title: "Geospatial alignment", body: "Both scenes warped to one EPSG:4326 grid." },
  { step: "04", title: "Temporal comparison", body: "Same-track pair near the 12-day repeat." },
  { step: "05", title: "Change detection", body: "Median screen, Otsu water split, dB threshold." },
  { step: "06", title: "Interpretation", body: "Deterministic explanation with uncertainty." },
  { step: "07", title: "Intelligence output", body: "Statistics, previews, and GeoJSON patches." },
];

const MISSIONS = [
  {
    name: "NASA NISAR",
    role: "Catalogue records and browse imagery",
    status: "Catalogue live",
    tone: "emerald" as const,
    href: "https://science.nasa.gov/mission/nisar/",
  },
  {
    name: "Sentinel-1 GRD",
    role: "Pixel-level change measurement",
    status: "Analysis live",
    tone: "emerald" as const,
    href: "https://registry.opendata.aws/sentinel-1/",
  },
  {
    name: "ASF DAAC",
    role: "Granule discovery and browse hosting",
    status: "No credentials",
    tone: "outline" as const,
    href: "https://search.asf.alaska.edu/",
  },
  {
    name: "NASA GIBS",
    role: "Daily optical basemap tiles",
    status: "Basemap live",
    tone: "outline" as const,
    href: "https://gibs.earthdata.nasa.gov/",
  },
];

export default function LandingPage() {
  return (
    <div>
      <OrbitalHero />

      <section className="container-page pt-10">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              href: "/live",
              icon: Radar,
              title: "Run a comparison",
              body: "Two Sentinel-1 passes, measured on demand.",
            },
            {
              href: "/map",
              icon: Layers3,
              title: "Open Earth Explorer",
              body: "Live NISAR footprints over NASA GIBS imagery.",
            },
            {
              href: "/timeline",
              icon: CalendarClock,
              title: "Track acquisitions",
              body: "Every pass and catalogue record for an area.",
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.href} delay={index * 0.04}>
                <Link href={item.href} className="panel panel-hover group flex items-center gap-4 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent/[0.08]">
                    <Icon className="size-4 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{item.body}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <div className="mt-14">
        <IntelligenceOverview />
      </div>

      <section className="container-page py-14">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Platform capability"
              title="Three systems, each with a real data source"
              body="Catalogue discovery, pixel-level change measurement, and geospatial presentation. Nothing on this site is a mock-up of an API response."
            />
            <Link href="/missions" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Data &amp; missions <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {CAPABILITIES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={index * 0.04}>
                <article className="panel flex h-full flex-col p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-md border border-line-strong bg-surface-high">
                      <Icon className="size-4 text-accent" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">{feature.body}</p>
                  <ul className="mt-4 space-y-1.5 border-t border-line/70 pt-3">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-center gap-1.5 text-[10px] text-muted-strong">
                        <CircleDot className="size-2.5 text-teal" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="briefing" className="container-page scroll-mt-24 pb-14">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <Reveal>
            <BriefingFilm />
          </Reveal>
          <Reveal delay={0.06}>
            <div className="panel h-full p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <p className="tech-label">Processing pipeline</p>
                <Badge variant="emerald">implemented</Badge>
              </div>
              <ol className="mt-4 space-y-0">
                {PIPELINE.map((stage, index) => (
                  <li key={stage.step} className="relative flex gap-3.5 pb-5 last:pb-0">
                    {index < PIPELINE.length - 1 ? (
                      <span className="absolute left-[15px] top-8 h-[calc(100%-1.75rem)] w-px bg-gradient-to-b from-accent/40 to-line" />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border font-mono text-[10px]",
                        index === PIPELINE.length - 1
                          ? "border-accent/50 bg-accent/[0.12] text-accent"
                          : "border-line-strong bg-surface text-muted",
                      )}
                    >
                      {stage.step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{stage.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{stage.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
                <Link href="/methodology" className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft">
                  Full methodology <ArrowRight className="size-3" />
                </Link>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  no steps invented
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-band">
        <div className="container-page py-14">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Monitoring areas"
                title="Three places with different water behaviour"
                body="Ganges-Brahmaputra delta, Louisiana's Atchafalaya Basin, and the Mekong delta. Each area has a bounding box, a live catalogue query, and a working change comparison."
              />
              <Link href="/map" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Open Earth Explorer <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-8">
            <ScenarioCards />
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Reveal>
            <div className="space-y-3">
              <SectionHeading
                eyebrow="Catalogue feed"
                title="Latest NISAR acquisitions"
                body="The newest granule records returned by the ASF search API over the last 30 days, worldwide. Click through to the product page in ASF Vertex."
              />
              <div className="pt-3">
                <LiveNisarFeed />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="panel h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <Database className="size-3.5 text-accent" />
                  <p className="text-xs font-semibold text-foreground">Missions and providers</p>
                </div>
                <Link href="/missions" className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent hover:text-accent-soft">
                  details
                </Link>
              </div>
              <div className="divide-y divide-line/60">
                {MISSIONS.map((mission) => (
                  <a
                    key={mission.name}
                    href={mission.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{mission.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{mission.role}</p>
                    </div>
                    <Badge variant={mission.tone} className="shrink-0">
                      {mission.status}
                    </Badge>
                  </a>
                ))}
              </div>
              <div className="border-t border-line px-4 py-2.5">
                <p className="font-mono text-[10px] text-muted">
                  NISAR pixel processing is not public yet; change uses Sentinel-1 C-band.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-page pb-16">
        <Reveal>
          <div className="panel bracket relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 grid-surface opacity-25" />
            <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <p className="eyebrow">Ready</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
                  Launch the explorer on an area you know
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Start at Atchafalaya, run a comparison, then read the interpretation with its
                  limits attached.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {[
                    { icon: HardDriveDownload, text: "No account required" },
                    { icon: ScanLine, text: "Reads only the AOI window" },
                    { icon: ShieldCheck, text: "Sources and caveats on screen" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <span key={item.text} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                        <Icon className="size-3.5 text-accent" />
                        {item.text}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link href="/map" className={cn(buttonVariants({ size: "lg" }))}>
                  Launch Earth Explorer <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/live"
                  className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
                >
                  Run a comparison <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}