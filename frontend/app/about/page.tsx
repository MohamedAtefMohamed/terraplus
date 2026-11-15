import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleDot } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description:
    "TerraPulse is an Earth-observation intelligence platform built for the NASA Space Apps Challenge 2026 challenge Dancing with the SARs.",
};

const PRINCIPLES = [
  {
    title: "Live data only",
    body: "Catalogue records come from the ASF DAAC search API. Pixel change is measured on public Sentinel-1 GRD scenes read in place. No synthetic radar dataset is generated.",
  },
  {
    title: "Source fidelity",
    body: "Every observation keeps its granule identifier, sensor, orbit direction, track and frame. Sentinel-1 pixels are never labelled as NISAR.",
  },
  {
    title: "Limits on screen",
    body: "Change numbers are relative backscatter screens. Wind, soil moisture, vegetation structure, and acquisition geometry move radar brightness without a change in surface water.",
  },
  {
    title: "Read-only by design",
    body: "No credentials are required anywhere. The platform issues read-only catalogue and scene requests; nothing is written back to a provider.",
  },
];

export default function AboutPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="About"
        title="An Earth-observation intelligence platform"
        description="TerraPulse was built for the 2026 NASA Space Apps Challenge challenge Dancing with the SARs. It turns radar observations into surface-change information for scientists, resource managers, educators, and the public."
        actions={
          <Link
            href="https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/?tab=resources"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Challenge brief <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel p-5">
          <h2 className="text-sm font-semibold text-foreground">What it does</h2>
          <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-muted-strong">
            <p>
              The platform queries the NISAR catalogue, renders real granule footprints over a
              current optical basemap, and measures change between two Sentinel-1 acquisitions on
              the same relative orbit. The measurement uses windowed, decimated reads from
              cloud-optimized GeoTIFFs, then applies a 3×3 median screen, an Otsu water split, and
              a configurable decibel threshold.
            </p>
            <p>
              The deltas that remain become a change preview, coverage statistics, and vectorized
              patches. A deterministic explanation states what the comparison supports, what it
              cannot support, and which processing parameters were used.
            </p>
            <p>
              NISAR L-band pixel processing is not public yet. Until it is, the catalogue and
              browse imagery are live and the pixel analysis uses Sentinel-1 C-band. The interface
              states that substitution on every result.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/map" className={cn(buttonVariants({ size: "sm" }))}>
              Launch Earth Explorer <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/methodology"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Methodology
            </Link>
            <a
              href="https://github.com/MohamedAtefMohamed/terraplus"
              target="_blank"
              rel="noreferrer noopener"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Source repository <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="tech-label">Operating principles</p>
          </div>
          <ul className="divide-y divide-line/60">
            {PRINCIPLES.map((item) => (
              <li key={item.title} className="px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <CircleDot className="size-3 text-accent" />
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            label: "Stack",
            value: "Next.js · FastAPI",
            note: "TypeScript frontend, Python backend, no database",
          },
          {
            label: "Geospatial",
            value: "MapLibre · Rasterio",
            note: "WarpedVRT alignment, windowed COG reads",
          },
          {
            label: "Analysis",
            value: "NumPy · SciPy · Shapely",
            note: "Median screen, Otsu split, vectorized patches",
          },
        ].map((item) => (
          <div key={item.label} className="panel p-4">
            <p className="tech-label">{item.label}</p>
            <p className="metric-value mt-2 text-lg font-semibold text-foreground">{item.value}</p>
            <p className="mt-1 text-[11px] text-muted">{item.note}</p>
          </div>
        ))}
      </section>

      <section className="panel mt-10 p-5">
        <h2 className="text-xs font-semibold text-foreground">Team and contact</h2>
        <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-muted">
          TerraPulse is an open submission for the NASA Space Apps Challenge. Issues, data-source
          corrections, and methodology questions are tracked in the public repository. NASA does
          not endorse this application, and it is not an operational, emergency, or safety product.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://github.com/MohamedAtefMohamed/terraplus/issues"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open an issue <ArrowUpRight className="size-3.5" />
          </a>
          <Link href="/missions" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Data &amp; missions <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}