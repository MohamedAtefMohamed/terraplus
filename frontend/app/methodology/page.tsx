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
    "How TerraPulse works: SAR fundamentals, NISAR context, the change-detection pipeline, data modes, results, limitations and source attribution.",
};

const TOC = [
  { id: "overview", label: "Overview" },
  { id: "sar", label: "What SAR is" },
  { id: "nisar", label: "NISAR context" },
  { id: "pipeline", label: "Processing pipeline" },
  { id: "measures", label: "What we measure" },
  { id: "interpretation", label: "Reading results" },
  { id: "data-modes", label: "Data modes" },
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
        title="What TerraPulse measures — and what it does not"
        description="A plain-language account of the radar physics, the processing pipeline, the data modes, the meaning of the outputs and the limits that judges, scientists and users should keep in view."
        actions={
          <Badge variant="amber">SYNTHETIC DEMO DATASET</Badge>
        }
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
                Bundled pixels are synthetic. Real coordinates, fabricated radar backscatter. No
                operational or safety use.
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
                TerraPulse is a demonstration of how satellite radar observations can be turned into
                understandable surface-change information. It connects four things that are often
                separated: observation discovery, raster comparison, spatial statistics and careful
                interpretation.
              </p>
              <p>
                The product is designed around the NASA-ISRO <strong className="text-foreground">NISAR</strong>{" "}
                mission, but it does not ship NISAR pixels. The bundled dataset is a{" "}
                <strong className="text-foreground">deterministic synthetic SAR demonstration</strong> with
                real geographic coordinates, realistic dB values, four-look speckle and nodata. Every
                screen exposes that origin.
              </p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  icon: FlaskConical,
                  title: "DEMO",
                  body: "Synthetic but physically shaped. Always available offline.",
                  tone: "amber" as const,
                },
                {
                  icon: Database,
                  title: "SAMPLE",
                  body: "Manifest-driven real sample products. Not staged in this build.",
                  tone: "accent" as const,
                },
                {
                  icon: Satellite,
                  title: "LIVE",
                  body: "Real NISAR granule metadata via ASF. No product download.",
                  tone: "emerald" as const,
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
                TerraPulse supports live NISAR <strong>metadata discovery</strong> through ASF. It
                does not download or calibrate NISAR products. Doing so requires authenticated NASA
                Earthdata access plus mission-specific product handling, which is outside this MVP.
                The app reports this status rather than hiding it. Live search results can be
                drawn as real NISAR granule footprints on the map; those polygons are metadata,
                not processed analysis layers.
              </Callout>
              <div className="flex flex-wrap gap-3">
                {[
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
              Data modes and fallback policy
            </H2>
            <div className="mt-4 space-y-3">
              {[
                {
                  icon: FlaskConical,
                  name: "DEMO",
                  badge: "amber" as const,
                  status: "Active · always available",
                  body: "Three demonstration regions are generated locally at four dates each. Scenes carry full GeoTIFF metadata, real EPSG:4326 footprints, synthetic VV dB backscatter, four-look speckle and nodata. Generated scene tags explicitly state that the data is synthetic.",
                },
                {
                  icon: Database,
                  name: "SAMPLE",
                  badge: "accent" as const,
                  status: "Adapter ready · not staged",
                  body: "A manifest at data/sample/manifest.json can register properly attributed real sample rasters. This build contains none. If SAMPLE is requested without a manifest, the app falls back to DEMO and displays that fallback rather than mislabelling data.",
                },
                {
                  icon: Satellite,
                  name: "LIVE",
                  badge: "emerald" as const,
                  status: "Metadata discovery enabled",
                  body: "The ASF DAAC search adapter queries real NISAR granule metadata. The result list is metadata only. Downloading and calibrating products requires NASA Earthdata Login and is not implemented; analyses therefore remain DEMO.",
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
                TerraPulse never labels Sentinel-1, synthetic data or unrelated products as NISAR.
                The mission name is used only for mission context and live metadata discovery.
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
                "The demo uses single-polarisation VV and no incidence-angle normalisation.",
                "The 5×5 median filter is a screening choice, not a validated speckle workflow.",
                "Thresholds are configurable screens, not universal constants.",
                "No optical, gauge or field validation is performed.",
                "The demonstration data is synthetic and must not be cited as a real event.",
                "Live NISAR products are not downloaded or processed in this MVP.",
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
                      name: "Esri World Imagery",
                      use: "Optional satellite basemap context",
                      href: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
                    },
                    {
                      name: "CARTO / OpenStreetMap",
                      use: "Optional dark basemap tiles",
                      href: "https://carto.com/attributions",
                    },
                    {
                      name: "TerraPulse demo generator",
                      use: "Synthetic SAR scenes and analysis products",
                      href: "#overview",
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
              Built with Next.js, FastAPI, MapLibre GL, Rasterio, NumPy, SciPy, Shapely and
              Recharts. The change-detection engine is original demonstration software and is not a
              NASA product. NISAR and NASA imagery remain subject to their respective terms.
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
                  See the method in action on the demo dataset
                </h2>
                <p className="mt-1 text-[11px] text-muted">
                  Compare the Sundarbans scenes, then read the explanation and its limitations.
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