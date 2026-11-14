import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Cloud,
  Database,
  Droplets,
  FlaskConical,
  Gauge,
  Info,
  Layers3,
  Moon,
  Radar,
  Satellite,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Signal,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How TerraPulse works: SAR fundamentals, NISAR context, the live change-detection pipeline, results, limitations, and source attribution.",
};

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "sar", label: "What SAR is" },
  { id: "nisar", label: "NISAR context" },
  { id: "pipeline", label: "Processing pipeline" },
  { id: "measures", label: "What we measure" },
  { id: "interpretation", label: "Reading results" },
  { id: "data-modes", label: "Data sources" },
  { id: "limitations", label: "Limitations" },
  { id: "sources", label: "Sources" },
];

function H2({ id, eyebrow, children }: { id: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="scroll-mt-24" id={id}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground sm:text-2xl">
        {children}
      </h2>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <div className="container-page py-8 lg:py-10">
      <PageHeader
        eyebrow="Methodology & data policy"
        title="What TerraPulse measures, and its limits"
        description="A plain-language account of the radar physics, the processing pipeline, the data modes, the meaning of the outputs and the limits that judges, scientists and users should keep in view."
        actions={<Badge variant="emerald">LIVE DATA PIPELINE</Badge>}
      />

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">On this page</p>
              <nav className="mt-3 space-y-1">
                {TOC.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-white/[0.035] hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
            <div className="rounded-md border border-amber/20 bg-amber/[0.05] p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber">
                <ShieldAlert className="size-3" /> Data notice
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                NISAR records and Sentinel-1 pixel comparisons are live. Readings are screening
                signals, not an operational or safety product.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-12">
          <section className="scroll-mt-24">
            <H2 id="overview" eyebrow="01 · Overview">
              A surface-intelligence layer, not a hazard oracle
            </H2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-strong">
              <p>
                TerraPulse turns radar observations into surface-change information. It connects
                observation discovery, raster comparison, spatial statistics, and interpretation in
                one interface.
              </p>
              <p>
                The pipeline is live end to end. The{" "}
                <strong className="text-foreground">live lab</strong> reads the NISAR catalogue from
                ASF and computes change on public Sentinel-1 GRD scenes, with no account and no
                full-scene download. The dashboard, timeline, map, and interpretation pages read
                from the same sources or from comparisons cached in the live lab.
              </p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Satellite,
                  title: "NISAR catalogue",
                  body: "Real granule records and browse quick-looks from the ASF DAAC.",
                  tone: "emerald" as const,
                },
                {
                  icon: Radar,
                  title: "Sentinel-1 change",
                  body: "Windowed COG reads on public GRD scenes, computed on demand.",
                  tone: "teal" as const,
                },
                {
                  icon: Layers3,
                  title: "NASA GIBS",
                  body: "Daily MODIS Terra optical basemap for context.",
                  tone: "accent" as const,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="panel p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant={item.tone}>{item.title}</Badge>
                      <Icon className="size-4 text-muted" />
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="scroll-mt-24">
            <H2 id="sar" eyebrow="02 · Radar fundamentals">
              What synthetic aperture radar actually sees
            </H2>
            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4 text-sm leading-relaxed text-muted-strong">
                <p>
                  A SAR instrument transmits microwave pulses and records the energy scattered back
                  from the surface. The measured quantity is <strong className="text-foreground">backscatter</strong>,
                  usually expressed in decibels (dB). It depends on surface roughness, geometry,
                  moisture, vegetation structure and the radar wavelength.
                </p>
                <p>
                  Because radar supplies its own illumination, it can observe through cloud and at
                  night. That is the core advantage over optical imagery in flood and wetland
                  monitoring. It is also why a radar change is not self-explanatory: many surface
                  properties can change the signal.
                </p>
                <div className="rounded-md border border-line bg-[#07101c] p-3.5 font-mono text-[11px] leading-relaxed text-muted-strong">
                  σ⁰(dB) = 10 · log₁₀(σ⁰_linear) <br />
                  ΔdB = 10 · log₁₀(P_later / P_earlier)
                </div>
              </div>
              <div className="panel p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Signal intuition
                </p>
                <div className="mt-3 space-y-3">
                  {[
                    { icon: Droplets, label: "Calm water", value: "Low return", tone: "text-accent" },
                    { icon: Layers3, label: "Rough / urban", value: "High return", tone: "text-amber" },
                    { icon: Cloud, label: "Cloud cover", value: "Unaffected", tone: "text-emerald" },
                    { icon: Moon, label: "Night", value: "Observable", tone: "text-emerald" },
                  ].map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="flex items-center gap-2 text-[10px]">
                        <Icon className={cn("size-3.5", row.tone)} />
                        <span className="text-muted">{row.label}</span>
                        <span className="ml-auto font-mono text-foreground">{row.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="scroll-mt-24">
            <H2 id="nisar" eyebrow="03 · Mission context">
              NISAR: the design target
            </H2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-strong">
              <p>
                NISAR (NASA-ISRO Synthetic Aperture Radar) is a joint Earth-observation mission
                carrying L-band and S-band radar. Its reference repeat cycle is about 12 days, and
                its science scope spans solid Earth deformation, ice, ecosystems, water and
                agriculture. TerraPulse uses NISAR as the architectural target for a surface-change
                intelligence layer.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: Radar, label: "Bands", value: "L-band + S-band" },
                  { icon: Satellite, label: "Agencies", value: "NASA · ISRO" },
                  { icon: Signal, label: "Repeat", value: "≈ 12 days" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-md border border-line bg-surface/60 p-3">
                      <Icon className="size-3.5 text-accent" />
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-foreground">{item.value}</p>
                    </div>
                  );
                })}
              </div>
              <Callout tone="warning" title="Integration status">
                The NISAR catalogue, browse quick-looks, and granule footprints are live from ASF.
                NISAR L-band pixel analysis is not: the archive currently serves RSLC, GSLC, and
                GCOV products, and turning them into comparable backscatter grids needs
                authenticated downloads and mission-specific calibration. The live lab therefore
                measures change on Sentinel-1 C-band GRD scenes and labels that substitution on
                every result.
              </Callout>
              <div className="flex flex-wrap gap-3">
                {[
                  {
                    href: "https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/?tab=resources",
                    label: "Space Apps 2026 challenge and resources",
                  },
                  { href: "https://science.nasa.gov/mission/nisar/", label: "NASA NISAR mission" },
                  { href: "https://nisar-docs.asf.alaska.edu/", label: "NISAR documentation" },
                  { href: "https://science.nasa.gov/mission/nisar/sample-data/", label: "Official sample data" },
                  { href: "https://search.asf.alaska.edu/", label: "ASF search" },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    {link.label} <ArrowUpRight className="size-3.5" />
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="scroll-mt-24">
            <H2 id="pipeline" eyebrow="04 · Processing">
              The change-detection pipeline
            </H2>
            <div className="mt-4 space-y-3">
              {[
                {
                  icon: ScanLine,
                  title: "1 · Load and validate",
                  body: "Read a single-band, georeferenced raster. Enforce supported formats, finite and physically plausible values, nodata handling and minimum valid coverage.",
                },
                {
                  icon: Layers3,
                  title: "2 · Align",
                  body: "Require identical shape, CRS and geotransform. If the scenes are not on the same grid, the comparison is rejected instead of silently producing nonsense.",
                },
                {
                  icon: Waves,
                  title: "3 · Prepare",
                  body: "Apply a 5×5 median filter as an explicit, inexpensive speckle-reduction screen. This is not a substitute for mission-grade calibration and multi-looking.",
                },
                {
                  icon: Signal,
                  title: "4 · Difference",
                  body: "Compute the per-pixel dB difference (later minus earlier) and, equivalently, the ratio of calibrated linear powers.",
                },
                {
                  icon: Droplets,
                  title: "5 · Classify",
                  body: "Flag increase/decrease beyond the configurable ± change threshold. Separately derive low-backscatter water-indicator masks and their gain, loss and persistence.",
                },
                {
                  icon: Gauge,
                  title: "6 · Quantify",
                  body: "Convert valid pixel counts to area using the geotransform and local latitude. Compute descriptive statistics, a robust noise estimate and a processing-quality score.",
                },
                {
                  icon: Layers3,
                  title: "7 · Render and vectorise",
                  body: "Produce colorized PNG overlays and simplified GeoJSON polygons for the web map. Keep source identifiers, method parameters and limitations attached.",
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex gap-3 rounded-md border border-line bg-surface/50 p-3.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded border border-line-strong bg-surface">
                      <Icon className="size-3.5 text-accent" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-foreground">{step.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">{step.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="scroll-mt-24">
            <H2 id="measures" eyebrow="05 · Outputs">
              What TerraPulse reports
            </H2>
            <div className="mt-4 space-y-4">
              <div className="overflow-hidden rounded-md border border-line">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line bg-surface/70 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      <th className="px-3 py-2.5 font-normal">Output</th>
                      <th className="px-3 py-2.5 font-normal">Definition</th>
                      <th className="px-3 py-2.5 font-normal">Not the same as</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10.5px]">
                    {[
                      ["Changed area", "pixels where |ΔdB| exceeds the configured threshold", "a flood extent"],
                      ["Water-indicator gain", "newly low-backscatter pixels beyond the water threshold", "confirmed inundation"],
                      ["Water-indicator loss", "pixels that stopped being low-backscatter", "drought or drainage"],
                      ["Processing quality", "coverage + residual noise + alignment", "probability of an event"],
                      ["Vector outlines", "simplified derived polygons for display", "surveyed boundaries"],
                    ].map((row) => (
                      <tr key={row[0]} className="border-b border-line/60 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-foreground">{row[0]}</td>
                        <td className="px-3 py-2.5 text-muted-strong">{row[1]}</td>
                        <td className="px-3 py-2.5 text-muted">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">
                The default thresholds are ±3.0 dB for change and −17.0 dB for the low-backscatter
                water indicator. They are configurable screening parameters chosen for the
                demonstration, not universal scientific constants.
              </p>
            </div>
          </section>

          <section className="scroll-mt-24">
            <H2 id="interpretation" eyebrow="06 · Interpretation">
              How to read a result responsibly
            </H2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md border border-emerald/20 bg-emerald/[0.045] p-4">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald">
                  <ShieldCheck className="size-3" /> Observation
                </p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-strong">
                  <li>· The later scene returned less/more energy over a defined area.</li>
                  <li>· A stated percentage of valid pixels crossed a stated threshold.</li>
                  <li>· The valid overlap and residual noise are known.</li>
                  <li>· The source observations are identified.</li>
                </ul>
              </div>
              <div className="rounded-md border border-amber/20 bg-amber/[0.045] p-4">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
                  <ShieldAlert className="size-3" /> Interpretation
                </p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-strong">
                  <li>· A darkening may be consistent with open water or wet, smooth surfaces.</li>
                  <li>· It may also be bare soil, harvest, vegetation collapse or radar shadow.</li>
                  <li>· Cause requires independent optical, gauge or field evidence.</li>
                  <li>· Never report this as a flood or damage assessment.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="scroll-mt-24">
            <H2 id="data-modes" eyebrow="07 · Transparency">
              Data sources and refresh policy
            </H2>
            <div className="mt-4 space-y-3">
              {[
                {
                  icon: Satellite,
                  name: "ASF DAAC",
                  badge: "emerald" as const,
                  status: "No credentials",
                  body: "Granule records, footprints, and browse quick-looks for NISAR. Catalogue queries are cached for four minutes per bounding box.",
                },
                {
                  icon: Database,
                  name: "Earth Search",
                  badge: "teal" as const,
                  status: "AWS Open Data",
                  body: "Sentinel-1 GRD STAC index. Scene searches are cached for three minutes; change results are cached for six hours per area and threshold.",
                },
                {
                  icon: Layers3,
                  name: "NASA GIBS",
                  badge: "accent" as const,
                  status: "Daily tiles",
                  body: "MODIS Terra corrected reflectance for the map basemap. The date is always yesterday in UTC.",
                },
              ].map((mode) => {
                const Icon = mode.icon;
                return (
                  <div key={mode.name} className="panel flex gap-3 p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded border border-line bg-surface">
                      <Icon className="size-4 text-accent" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={mode.badge}>{mode.name}</Badge>
                        <span className="font-mono text-[10px] text-muted">{mode.status}</span>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted">{mode.body}</p>
                    </div>
                  </div>
                );
              })}
              <Callout tone="info" title="Attribution rule">
                TerraPulse never labels Sentinel-1 pixels as NISAR. Every result states its
                sensor, scene identifiers, and processing parameters.
              </Callout>
            </div>
          </section>

          <section className="scroll-mt-24">
            <H2 id="limitations" eyebrow="08 · Limits">
              Limitations you should state out loud
            </H2>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                "A backscatter change does not identify a cause.",
                "Surface roughness, vegetation, soil moisture and acquisition geometry can mimic a water signal.",
                "Live comparisons use Sentinel-1 C-band VV with no incidence-angle normalisation.",
                "The 3×3 median filter is a screening choice, not a validated speckle workflow.",
                "Thresholds are configurable screens, not universal constants.",
                "No optical, gauge or field validation is performed.",
                "NISAR L-band pixels are not processed yet; live change uses Sentinel-1 C-band.",
                "Catalogue availability reflects what ASF has published, not a guarantee of future coverage.",
                "The processing-quality score is not an event probability.",
                "The application is not an emergency, safety or operational product.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-md border border-line bg-surface/50 p-3 text-[11px] leading-relaxed text-muted-strong"
                >
                  <Info className="mt-0.5 size-3 shrink-0 text-amber" />
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="scroll-mt-24">
            <H2 id="sources" eyebrow="09 · Attribution">
              Data sources and credits
            </H2>
            <div className="mt-4 overflow-hidden rounded-md border border-line">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface/70 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    <th className="px-3 py-2.5 font-normal">Source</th>
                    <th className="px-3 py-2.5 font-normal">Use in TerraPulse</th>
                    <th className="px-3 py-2.5 font-normal">Link</th>
                  </tr>
                </thead>
                <tbody className="text-[10.5px]">
                  {[
                    {
                      name: "NASA NISAR mission",
                      use: "Mission context, product families, design target",
                      href: "https://science.nasa.gov/mission/nisar/",
                    },
                    {
                      name: "ASF DAAC",
                      use: "Live NISAR granule metadata discovery",
                      href: "https://search.asf.alaska.edu/",
                    },
                    {
                      name: "NISAR documentation",
                      use: "Product and processing reference",
                      href: "https://nisar-docs.asf.alaska.edu/",
                    },
                    {
                      name: "NISAR sample data",
                      use: "Official sample-product reference",
                      href: "https://science.nasa.gov/mission/nisar/sample-data/",
                    },
                    {
                      name: "Element 84 Earth Search",
                      use: "Sentinel-1 GRD STAC index",
                      href: "https://earth-search.aws.element84.com/v1",
                    },
                    {
                      name: "AWS Open Data · sentinel-s1-l1c",
                      use: "Cloud-optimized Sentinel-1 GRD scenes",
                      href: "https://registry.opendata.aws/sentinel-1/",
                    },
                    {
                      name: "NASA GIBS",
                      use: "Daily optical basemap",
                      href: "https://gibs.earthdata.nasa.gov/",
                    },
                    {
                      name: "Space Apps 2026 challenge",
                      use: "Challenge brief and NASA resources",
                      href: "https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/?tab=resources",
                    },
                  ].map((row) => (
                    <tr key={row.name} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-foreground">{row.name}</td>
                      <td className="px-3 py-2.5 text-muted-strong">{row.use}</td>
                      <td className="px-3 py-2.5">
                        <a
                          href={row.href}
                          target={row.href.startsWith("http") ? "_blank" : undefined}
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-accent hover:text-accent-soft"
                        >
                          Open <ArrowUpRight className="size-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Built with Next.js, FastAPI, MapLibre GL, Rasterio, NumPy, SciPy, and Shapely.
              The change-detection engine is original software and is not a NASA product. NISAR
              and NASA imagery remain subject to their respective terms.
            </p>
          </section>

          <div className="panel relative overflow-hidden p-6">
            <div className="pointer-events-none absolute inset-0 grid-surface opacity-30" />
            <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                  <BookOpen className="size-3" /> Ready to inspect
                </p>
                <h2 className="mt-1.5 text-lg font-semibold text-foreground">
                  See the method on a live comparison
                </h2>
                <p className="mt-1 text-[11px] text-muted">
                  Compare a delta or basin, then read the interpretation and its limits.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href="/analysis" className={cn(buttonVariants({ size: "sm" }))}>
                  Run analysis <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/dashboard"
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}