"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Crosshair,
  Database,
  FileJson,
  GitCompareArrows,
  Layers3,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STAGES = [
  {
    id: "acquisition",
    step: "01",
    title: "Data acquisition",
    icon: Database,
    summary: "Catalogue and scene discovery",
    body: "Sentinel-1 GRD scenes are found through the Element 84 Earth Search STAC index across both IW (mid-latitude) and EW (polar ice) modes. NISAR granule records and browse imagery come from the ASF DAAC search API.",
    implementation: [
      "GET /api/live/sentinel1 → POST earth-search /search",
      "GET /api/live/nisar → ASF search API (output=geojson)",
      "Catalogue queries cached 4 minutes · scene searches 3 minutes",
    ],
    signal: "HTTP",
  },
  {
    id: "preprocessing",
    step: "02",
    title: "Preprocessing",
    icon: ScanLine,
    summary: "Windowed, decimated reads",
    body: "Each scene is read through a window that covers only the area of interest at a reduced output size, so a 240 MB scene never downloads in full. Reads use GDAL range requests over HTTPS.",
    implementation: [
      "rasterio Window(bbox) with out_shape downsampling",
      "CPL_VSIL_CURL_ALLOWED_EXTENSIONS=.tif,.tiff",
      "GRD digital numbers squared to power, then converted to dB",
    ],
    signal: "EPSG:4326",
  },
  {
    id: "alignment",
    step: "03",
    title: "Geospatial alignment",
    icon: Layers3,
    summary: "Shared grid for both passes",
    body: "Sentinel-1 GRD COGs carry GCP geolocation with an identity transform, so both scenes are warped through a WarpedVRT into one EPSG:4326 grid over the area of interest before any pixel is compared.",
    implementation: [
      "rasterio.vrt.WarpedVRT(crs='EPSG:4326', resampling=average)",
      "NoData preserved as NaN through the warp",
      "Output grid: 512 × 512 px over the area bbox",
    ],
    signal: "512²",
  },
  {
    id: "comparison",
    step: "04",
    title: "Temporal comparison",
    icon: GitCompareArrows,
    summary: "Same track, 12-day repeat",
    body: "Scenes are grouped by relative orbit and orbit direction. The engine picks the pair closest to the mission's repeat interval and rejects pairs closer than three days, because short gaps rarely carry usable change.",
    implementation: [
      "Group by relative orbit, orbit state, mode and band",
      "Score against the 6-day and 12-day repeats, minimum gap 3 days",
      "pair_preference reported with every result",
    ],
    signal: "12 d",
  },
  {
    id: "detection",
    step: "05",
    title: "Change detection",
    icon: Crosshair,
    summary: "Median screen, Otsu split, dB threshold",
    body: "A 3×3 median filter reduces speckle. Water is separated with an Otsu threshold computed from the pooled dB histogram of both passes. Pixels beyond the change threshold become the change mask.",
    implementation: [
      "Like-polarisation channel (VV preferred, HH over ice)",
      "Otsu split on pooled dB histogram (bounded to p2–p98)",
      "changed = |ΔdB| > 3.0 dB (adjustable 1.5–6.0)",
    ],
    signal: "±3.0 dB",
  },
  {
    id: "interpretation",
    step: "06",
    title: "Interpretation",
    icon: Sparkles,
    summary: "Deterministic explanation",
    body: "The engine converts measurements into a cautious narrative without an LLM: what changed, by how much, over what period, which drivers are plausible, and which conclusions the data cannot support.",
    implementation: [
      "Headline from net water-indicator change",
      "Confidence from valid coverage and pair spacing",
      "No atmospheric correction, no absolute calibration",
    ],
    signal: "read-only",
  },
  {
    id: "output",
    step: "07",
    title: "Intelligence output",
    icon: FileJson,
    summary: "Preview, statistics, vectors",
    body: "Results return as before/after/change PNG previews, coverage and change statistics, and vectorized change patches as GeoJSON. Everything caches for six hours per area and threshold.",
    implementation: [
      "media: before.png · after.png · change.png",
      "stats: coverage, change, water gain/loss fractions",
      "geojson: polygons simplified to 0.0007°",
    ],
    signal: "GeoJSON",
  },
];

export function PipelineStepper() {
  const [active, setActive] = useState(0);
  const stage = STAGES[active];
  const Icon = stage.icon;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ol className="relative space-y-1.5">
        {STAGES.map((item, index) => {
          const ItemIcon = item.icon;
          const selected = index === active;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-current={selected}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-accent/45 bg-accent/[0.08]"
                    : "border-line bg-surface/50 hover:border-line-strong",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded border font-mono text-[10px]",
                    selected
                      ? "border-accent/50 bg-accent/[0.14] text-accent"
                      : "border-line-strong bg-surface text-muted",
                  )}
                >
                  {item.step}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground">{item.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-muted">
                    {item.summary}
                  </span>
                </span>
                <ItemIcon
                  className={cn(
                    "size-3.5 shrink-0",
                    selected ? "text-accent" : "text-muted group-hover:text-muted-strong",
                  )}
                />
              </button>
              {index < STAGES.length - 1 ? (
                <span className="ml-[26px] block h-1.5 w-px bg-line-strong/70" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <motion.div
        key={stage.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="panel bracket h-full p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md border border-accent/30 bg-accent/[0.1]">
              <Icon className="size-4 text-accent" />
            </span>
            <div>
              <p className="tech-label">Stage {stage.step}</p>
              <h3 className="text-sm font-semibold text-foreground">{stage.title}</h3>
            </div>
          </div>
          <Badge variant="outline">{stage.signal}</Badge>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-muted-strong">{stage.body}</p>

        <div className="mt-4 border-t border-line pt-3">
          <p className="tech-label">Implementing calls</p>
          <ul className="mt-2 space-y-1.5">
            {stage.implementation.map((line) => (
              <li
                key={line}
                className="rounded border border-line bg-background/50 px-2.5 py-1.5 font-mono text-[10px] text-muted-strong"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setActive((value) => Math.max(0, value - 1))}
            disabled={active === 0}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted disabled:opacity-40"
          >
            ← previous
          </button>
          <p className="font-mono text-[10px] text-muted">
            {active + 1} / {STAGES.length}
          </p>
          <button
            type="button"
            onClick={() => setActive((value) => Math.min(STAGES.length - 1, value + 1))}
            disabled={active === STAGES.length - 1}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent disabled:opacity-40"
          >
            next →
          </button>
        </div>
      </motion.div>
    </div>
  );
}