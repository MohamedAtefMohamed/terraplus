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
import { LandingStats } from "@/components/landing/landing-stats";
import { LiveNisarFeed } from "@/components/landing/live-nisar-feed";
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

export default function LandingPage() {
  return (
    <div>
      <section className="container-page grid grid-cols-1 items-start gap-10 pb-14 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-20 lg:pt-14">
        <div className="space-y-6">
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">
                <Satellite className="size-3" />
                NASA Space Apps Challenge
              </Badge>
              <Badge variant="teal">
                <Radar className="size-3" />
                NISAR catalogue live
              </Badge>
              <Badge variant="emerald">Sentinel-1 analysis live</Badge>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.04em] text-foreground sm:text-[3.2rem] lg:text-[3.5rem]">
                Read surface change with radar, day or night.
              </h1>
              <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted-strong">
                TerraPulse queries the ASF catalogue for NISAR acquisitions and measures
                change between real Sentinel-1 scenes. Pick a monitoring area, compare two
                passes, and see the backscatter difference, water masks, and vector patches
                that follow from it.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/live" className={cn(buttonVariants({ size: "lg" }))}>
                Open the live lab
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/map" className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}>
                <Layers3 className="size-4" />
                Browse the map
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-3">
              {[
                { icon: Database, text: "NISAR records from ASF, no login" },
                { icon: ScanLine, text: "Pixel change on Sentinel-1 GRD" },
                { icon: ShieldCheck, text: "Every source and caveat on screen" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.text}
                    className="flex items-start gap-2 text-[11px] leading-snug text-muted"
                  >
                    <Icon className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    {item.text}
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <LiveNisarFeed />
        </Reveal>
      </section>

      <div className="container-page pb-16">
        <LandingStats />
      </div>

      <section className="border-y border-line/70">
        <div className="container-page py-16">
          <Reveal>
            <SectionHeading
              eyebrow="What runs today"
              title="Three pieces, each with a real data source"
              body="The catalogue, the comparison, and the map all read from live services. Nothing on this page is a mock-up of an API response."
            />
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                icon: Satellite,
                title: "NISAR catalogue",
                body: "The ASF DAAC search API returns recent NISAR granules with orbit direction, track, frame, product level, and the official browse quick-look. Browsing needs no account.",
                points: ["ASF search API", "Browse PNGs from NASA Earthdata Cloud", "RSLC, GSLC, GCOV products"],
              },
              {
                icon: GitCompareArrows,
                title: "Change comparison",
                body: "Two Sentinel-1 GRD scenes from the same relative orbit are paired, read through cloud-optimized GeoTIFF windows, and compared in decibels after a 3×3 speckle screen.",
                points: ["Windowed COG reads", "Adaptive water threshold", "GeoJSON patches"],
              },
              {
                icon: Layers3,
                title: "Map and timeline",
                body: "Footprints, monitoring areas, and vector change patches render in MapLibre. NASA GIBS supplies a current optical basemap; the radar layers sit on top.",
                points: ["MapLibre GL", "NASA GIBS imagery", "Deep links per area"],
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={index * 0.04}>
                  <article className="panel flex h-full flex-col p-5">
                    <div className="flex size-9 items-center justify-center rounded-md border border-line-strong bg-surface-high">
                      <Icon className="size-4 text-accent" />
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
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <Reveal>
            <SectionHeading
              eyebrow="How a comparison runs"
              title="Four steps you can audit"
              body="Each step keeps its inputs and parameters attached to the result so the numbers can be checked later."
            />
            <div className="mt-7">
              {[
                {
                  step: "01",
                  icon: Database,
                  title: "Search the catalogue",
                  body: "Query Sentinel-1 GRD scenes that intersect the area inside the selected window.",
                },
                {
                  step: "02",
                  icon: CalendarClock,
                  title: "Pair the passes",
                  body: "Group scenes by relative orbit and orbit direction, then pick the pair closest to the 12-day repeat. A gap under three days is rejected.",
                },
                {
                  step: "03",
                  icon: HardDriveDownload,
                  title: "Read only the overlap",
                  body: "Open both COGs over HTTPS and read a decimated window for the area. No full scene download.",
                },
                {
                  step: "04",
                  icon: ScanLine,
                  title: "Measure and vectorize",
                  body: "Median-filter the dB grids, split water with an Otsu threshold, apply the change threshold, and polygonize the patches.",
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="relative flex gap-4 pb-7 last:pb-0">
                    {index < 3 ? (
                      <span className="absolute left-[19px] top-10 h-[calc(100%-2rem)] w-px bg-line" />
                    ) : null}
                    <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface">
                      <Icon className="size-4 text-accent" />
                    </div>
                    <div className="pt-0.5">
                      <p className="font-mono text-[10px] tracking-[0.18em] text-muted">
                        STEP {item.step}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Default parameters
                </span>
                <Badge variant="emerald">live</Badge>
              </div>
              <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
                {[
                  { label: "Sensor", value: "Sentinel-1 GRD VV", sub: "C-band · IW mode" },
                  { label: "Repeat target", value: "12 days", sub: "same relative orbit" },
                  { label: "Change screen", value: "± 3.0 dB", sub: "adjustable 1.5–6.0" },
                  { label: "Water split", value: "Otsu", sub: "pooled dB histogram" },
                  { label: "Speckle", value: "3 × 3 median", sub: "screen only" },
                  { label: "Outputs", value: "PNG · stats · GeoJSON", sub: "cached six hours" },
                ].map((item) => (
                  <div key={item.label} className="bg-surface/90 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {item.label}
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-foreground">{item.value}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">{item.sub}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-line bg-[#0a0f13] p-4">
                <pre className="scrollbar-thin overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-strong">
{`dB   = 10 · log10( DN² )
ΔdB  = dB_later − dB_earlier
changed   = |ΔdB| > threshold
new_water = (later < water_thr) ∧ ¬(earlier < water_thr)`}
                </pre>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line/70">
        <div className="container-page py-16">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Monitoring areas"
                title="Three places with different water behavior"
                body="Ganges-Brahmaputra delta, Louisiana's Atchafalaya Basin, and the Mekong delta. Each area has a bounding box, a live catalogue query, and a working change comparison."
              />
              <Link href="/map" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Open full map <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-8">
            <ScenarioCards />
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <Reveal>
            <div className="space-y-4">
              <SectionHeading
                eyebrow="Data status"
                title="What is NISAR today, and what is still coming"
                body="NISAR launched in 2025 and its archive is filling up. The catalogue already serves RSLC, GSLC, and GCOV records with browse imagery. Analysis-ready L-band change products are not public yet, so the pixel comparison uses Sentinel-1."
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="teal">L-band + S-band</Badge>
                <Badge variant="outline">12-day repeat</Badge>
                <Badge variant="outline">NASA · ISRO</Badge>
                <Badge variant="emerald">Archive live</Badge>
              </div>
              <div className="rounded-md border border-line-strong bg-surface/60 p-4">
                <div className="flex gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal" />
                  <p className="text-xs leading-relaxed text-muted-strong">
                    NISAR browse images are amplitude quick-looks. They show where the radar
                    saw something, not a calibrated measurement. The change comparison is a
                    C-band Sentinel-1 bridge, labelled as such on every screen.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href="https://science.nasa.gov/mission/nisar/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  NASA NISAR mission <ArrowUpRight className="size-3.5" />
                </a>
                <Link href="/methodology" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                  Read the methodology <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="panel p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Sources in use
                </span>
                <Radar className="size-3.5 text-teal" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  {
                    name: "ASF DAAC search API",
                    href: "https://search.asf.alaska.edu/",
                    note: "NISAR granule records and browse images",
                  },
                  {
                    name: "Element 84 Earth Search",
                    href: "https://earth-search.aws.element84.com/v1",
                    note: "Sentinel-1 GRD STAC index on AWS Open Data",
                  },
                  {
                    name: "NASA GIBS",
                    href: "https://gibs.earthdata.nasa.gov/",
                    note: "Daily optical basemap tiles",
                  },
                  {
                    name: "AWS Open Data · sentinel-s1-l1c",
                    href: "https://registry.opendata.aws/sentinel-1/",
                    note: "Cloud-optimized GRD scenes read in place",
                  },
                ].map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block rounded-md border border-line px-3 py-2.5 transition-colors hover:border-line-strong"
                  >
                    <p className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
                      {item.name}
                      <ArrowUpRight className="size-3 shrink-0 text-muted" />
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">{item.note}</p>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="container-page pb-20">
        <Reveal>
          <div className="panel flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                Run a comparison on an area you know
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The live lab takes about ten seconds per area on a warm backend. Start with
                Atchafalaya, then try the delta areas after a monsoon month.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/live" className={cn(buttonVariants({ size: "lg" }))}>
                Open live lab <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
              >
                Dashboard
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}