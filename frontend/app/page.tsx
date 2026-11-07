import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  CircuitBoard,
  Cpu,
  Database,
  Droplets,
  GitCompareArrows,
  Globe2,
  Layers3,
  LineChart,
  Radar,
  ScanLine,
  Satellite,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EarthVisual } from "@/components/landing/earth-visual";
import { LandingStats } from "@/components/landing/landing-stats";
import { ScenarioCards } from "@/components/landing/scenario-cards";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto text-center")}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-[2rem]">
        {title}
      </h2>
      {body ? <p className="text-sm leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-accent/[0.055] blur-[120px]" />
        <div className="container-page relative grid grid-cols-1 items-center gap-12 pb-16 pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 lg:pb-24 lg:pt-16">
          <div className="space-y-7">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">
                  <Satellite className="size-3" />
                  NASA Space Apps Challenge
                </Badge>
                <Badge variant="outline">
                  <Radar className="size-3" />
                  NISAR-ready architecture
                </Badge>
                <Badge variant="amber">DEMO DATA</Badge>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="space-y-5">
                <p className="eyebrow">Earth surface intelligence platform</p>
                <h1 className="max-w-2xl text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.045em] text-foreground sm:text-[3.4rem] lg:text-[3.7rem]">
                  Understand Earth&apos;s changes.
                  <br />
                  <span className="text-gradient">Before they become disasters.</span>
                </h1>
                <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted-strong">
                  TerraPulse turns complex SAR observations into understandable geospatial
                  insight. Explore real coordinates, compare satellite scenes, detect surface
                  change, and read a careful, evidence-linked explanation — no Earthdata
                  credentials required.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
                  Open intelligence console
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/map"
                  className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
                >
                  <Globe2 className="size-4" />
                  Explore the map
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-3">
                {[
                  { icon: ShieldCheck, text: "Every synthetic pixel disclosed" },
                  { icon: Database, text: "Works fully offline after install" },
                  { icon: Sparkles, text: "Deterministic AI explanation" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-start gap-2 text-[11px] leading-snug text-muted">
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-accent" />
                      {item.text}
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="relative">
            <EarthVisual />
          </Reveal>
        </div>

        <div className="container-page pb-16">
          <LandingStats />
        </div>
      </section>

      <section className="container-page py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Capabilities"
            title="A surface intelligence workflow, not a static dashboard"
            body="TerraPulse connects discovery, paired-scene processing, spatial statistics and cautious narration in one coherent console."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ScanLine,
              title: "Explainable change detection",
              body: "Calibrated dB differencing with configurable thresholds and a low-backscatter water indicator — never a black box.",
              points: ["± dB screening", "Water gain / loss", "Nodata aware"],
            },
            {
              icon: GitCompareArrows,
              title: "Before / after workspace",
              body: "Pick two acquisitions, run a real raster comparison, and inspect the derived overlays, statistics and vector outlines.",
              points: ["Persisted analyses", "GeoJSON layers", "Quality indicators"],
            },
            {
              icon: LineChart,
              title: "Temporal monitoring",
              body: "Follow a monitoring area through its observation record and compare consecutive scenes to see how a signal evolves.",
              points: ["Timeline view", "Trend charts", "Availability gaps"],
            },
            {
              icon: Sparkles,
              title: "AI-assisted interpretation",
              body: "A deterministic explanation engine separates observations from interpretation. Optional LLM narration is never required.",
              points: ["Uncertainty stated", "Source-linked", "No credentials needed"],
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={index * 0.05}>
                <article className="panel panel-hover flex h-full flex-col p-5">
                  <div className="flex size-9 items-center justify-center rounded-md border border-accent/20 bg-accent/[0.07]">
                    <Icon className="size-4 text-accent" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">{feature.body}</p>
                  <ul className="mt-4 space-y-1.5 border-t border-line/70 pt-3">
                    {feature.points.map((point) => (
                      <li key={point} className="flex items-center gap-1.5 text-[10px] text-muted-strong">
                        <CheckCircle2 className="size-3 text-emerald" />
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

      <section className="border-y border-line/70 bg-background-soft/40">
        <div className="container-page py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <Reveal>
              <SectionHeading
                eyebrow="How it works"
                title="From radar return to decision context"
                body="Four transparent stages. Every derived product keeps its provenance, method and limitations attached."
              />
              <div className="mt-8 space-y-0">
                {[
                  {
                    step: "01",
                    icon: Satellite,
                    title: "Discover observations",
                    body: "Search demo areas or query live NISAR granule metadata through ASF. Discovery and processing are labelled separately.",
                  },
                  {
                    step: "02",
                    icon: Layers3,
                    title: "Align and validate",
                    body: "Check grid, CRS, geotransform, nodata and validity before any pixel is compared. Unsuitable pairs are rejected.",
                  },
                  {
                    step: "03",
                    icon: GitCompareArrows,
                    title: "Detect surface change",
                    body: "Compute a speckle-suppressed dB difference, water-indicator masks, spatial statistics and vector outlines.",
                  },
                  {
                    step: "04",
                    icon: Cpu,
                    title: "Explain with uncertainty",
                    body: "Turn results into a careful narrative that separates measured facts from interpretation and states what cannot be concluded.",
                  },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.step} className="relative flex gap-4 pb-8 last:pb-0">
                      {index < 3 ? (
                        <span className="absolute left-[19px] top-10 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-line-strong to-transparent" />
                      ) : null}
                      <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface">
                        <Icon className="size-4 text-accent" />
                      </div>
                      <div className="pt-0.5">
                        <p className="font-mono text-[10px] tracking-[0.18em] text-muted">
                          STAGE {item.step}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-foreground">{item.title}</h3>
                        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <CircuitBoard className="size-3.5 text-accent" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                      Processing contract
                    </span>
                  </div>
                  <Badge variant="amber">DEMO</Badge>
                </div>
                <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
                  {[
                    { label: "Earlier scene", value: "Synthetic dB GeoTIFF", sub: "EPSG:4326 · VV" },
                    { label: "Later scene", value: "Synthetic dB GeoTIFF", sub: "same grid required" },
                    { label: "Change threshold", value: "± 3.0 dB", sub: "configurable screen" },
                    { label: "Water indicator", value: "< −17.0 dB", sub: "proxy, not flood extent" },
                    { label: "Speckle handling", value: "5 × 5 median", sub: "screening only" },
                    { label: "Outputs", value: "Stats · PNG · GeoJSON", sub: "with provenance" },
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
                <div className="border-t border-line bg-[#07101c] p-4">
                  <pre className="scrollbar-thin overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-strong">
{`ΔdB = 10 · log10( P_later / P_earlier )
changed  = |ΔdB| > threshold
new_water = (later < water_thr) ∧ ¬(earlier < water_thr)`}
                  </pre>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <Reveal>
            <div className="space-y-5">
              <SectionHeading
                eyebrow="Mission context"
                title="Built around NISAR, honest about the data"
                body="NISAR is the NASA-ISRO Synthetic Aperture Radar mission: dual-band radar designed to observe solid Earth, ice, ecosystems and water. TerraPulse is designed as a NISAR-ready surface-intelligence layer."
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="teal">L-band + S-band</Badge>
                <Badge variant="outline">12-day repeat reference</Badge>
                <Badge variant="outline">NASA · ISRO</Badge>
                <Badge variant="emerald">Launched 2025</Badge>
              </div>
              <div className="rounded-md border border-amber/25 bg-amber/[0.055] p-4">
                <div className="flex gap-2.5">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber" />
                  <div className="space-y-1 text-xs leading-relaxed text-muted-strong">
                    <p className="font-medium text-amber">No NISAR pixels are bundled</p>
                    <p>
                      The demo uses synthetic C-band-style backscatter scenes with real geography.
                      Live metadata discovery is implemented through ASF; authenticated download
                      and calibration are clearly marked as not enabled.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
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

          <Reveal delay={0.08}>
            <div className="panel p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Mission reference
                </span>
                <Satellite className="size-3.5 text-accent" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line">
                {[
                  { label: "Agencies", value: "NASA / ISRO" },
                  { label: "Frequency", value: "L + S band" },
                  { label: "Repeat cycle", value: "12 days" },
                  { label: "Access", value: "ASF DAAC" },
                  { label: "Applications", value: "Earth system" },
                  { label: "MVP status", value: "Metadata only" },
                ].map((item) => (
                  <div key={item.label} className="bg-surface p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { icon: Waves, text: "Radar observes surface structure through cloud and darkness." },
                  { icon: Droplets, text: "Water-indicator changes are screening signals, not flood declarations." },
                  { icon: Cpu, text: "The processing pipeline is designed to ingest calibrated backscatter products." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-teal" />
                      {item.text}
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line/70 bg-background-soft/40">
        <div className="container-page py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Demonstration areas"
                title="Three monitoring stories, clearly labelled"
                body="Real coordinates. Synthetic radar. Each area carries multiple demo acquisition dates so you can compare, chart and explain a change."
              />
              <Link href="/map" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Open full map <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10">
            <ScenarioCards />
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <Reveal>
          <SectionHeading
            eyebrow="Data modes"
            title="One platform, three honest data states"
            body="TerraPulse never hides where a pixel came from. The active mode is visible throughout the interface."
          />
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              key: "DEMO",
              tone: "amber" as const,
              icon: Camera,
              status: "Always available",
              body: "Deterministic synthetic SAR scenes generated locally with real coordinates, dB values and nodata. Powers the full experience offline.",
            },
            {
              key: "SAMPLE",
              tone: "accent" as const,
              icon: Database,
              status: "Adapter ready · not staged",
              body: "A manifest-driven path for properly attributed real sample products. This build ships none, so SAMPLE transparently falls back to DEMO.",
            },
            {
              key: "LIVE",
              tone: "emerald" as const,
              icon: Satellite,
              status: "Metadata discovery enabled",
              body: "Query ASF for actual NISAR granule metadata. Downloading and calibrating products needs authenticated Earthdata access and is out of MVP scope.",
            },
          ].map((mode, index) => {
            const Icon = mode.icon;
            return (
              <Reveal key={mode.key} delay={index * 0.05}>
                <article className="panel p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant={mode.tone}>{mode.key}</Badge>
                    <Icon className="size-4 text-muted" />
                  </div>
                  <p className="mt-4 text-xs font-medium text-foreground">{mode.status}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{mode.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="container-page pb-24">
        <Reveal>
          <div className="panel relative overflow-hidden px-6 py-12 sm:px-12">
            <div className="pointer-events-none absolute inset-0 grid-surface opacity-40" />
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/10 blur-[80px]" />
            <div className="relative mx-auto max-w-3xl text-center">
              <Badge variant="accent" className="mx-auto">
                <Radar className="size-3" /> TerraPulse console
              </Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                Explore a changing surface.
                <br className="hidden sm:block" /> Read what the data can — and cannot — tell you.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
                Start with the Sundarbans delta, run a before/after comparison, then open the
                explanation panel. The entire flow works without NASA credentials.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
                  Launch TerraPulse <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/analysis"
                  className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
                >
                  Run a comparison
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}