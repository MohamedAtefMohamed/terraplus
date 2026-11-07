"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Droplets,
  Info,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { Analysis, AnalysisStatistics, Location } from "@/types/api";
import { api, apiUrl } from "@/lib/api";
import {
  cn,
  confidenceTone,
  formatNumber,
  percent,
  signed,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Meter } from "@/components/ui/meter";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynamicMap } from "@/components/map/dynamic-map";
import { MapStatusHint } from "@/components/map/map-status";
import { BeforeAfterSlider } from "@/components/analysis/before-after-slider";

function Metric({
  label,
  value,
  unit,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  tone?: "default" | "accent" | "orange" | "emerald";
}) {
  const toneClass = {
    default: "text-foreground",
    accent: "text-accent",
    orange: "text-orange",
    emerald: "text-emerald",
  }[tone];
  return (
    <div className="rounded-md border border-line bg-surface/60 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={cn("mt-1 text-base font-semibold metric-value", toneClass)}>
        {value}
        {unit ? <span className="ml-1 text-[10px] font-normal text-muted">{unit}</span> : null}
      </p>
      {detail ? <p className="mt-0.5 text-[10px] text-muted">{detail}</p> : null}
    </div>
  );
}

function StatTable({ data, fallback }: { data: AnalysisStatistics | undefined; fallback: Analysis }) {
  if (!data) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-10 w-full" />
        ))}
        <p className="text-[10px] text-muted">Loading statistics endpoint…</p>
      </div>
    );
  }
  const categories = Array.from(new Set(data.rows.map((row) => row.category)));
  return (
    <div className="space-y-5">
      {categories.map((category) => (
        <div key={category}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
            {category}
          </p>
          <div className="overflow-hidden rounded-md border border-line">
            <table className="w-full text-left">
              <tbody>
                {data.rows
                  .filter((row) => row.category === category)
                  .map((row) => (
                    <tr key={row.key} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2.5 align-top">
                        <p className="text-[11px] font-medium text-foreground">{row.label}</p>
                        {row.description ? (
                          <p className="mt-0.5 max-w-lg text-[11px] leading-relaxed text-muted">
                            {row.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-top">
                        <span className="font-mono text-[11px] text-foreground">
                          {row.value === null ? "—" : formatNumber(row.value, 2)}
                        </span>
                        {row.unit ? (
                          <span className="ml-1 text-[10px] text-muted">{row.unit}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="text-[11px] leading-relaxed text-muted">
        Statistics are computed from the demonstration raster pair at {fallback.stats.center_lat?.toFixed(2)}°,{" "}
        {fallback.stats.center_lon?.toFixed(2)}°. Percent values are rounded for display.
      </p>
    </div>
  );
}

export function AnalysisResult({
  analysis,
  location,
}: {
  analysis: Analysis;
  location?: Location | null;
}) {
  const [showWater, setShowWater] = useState(true);
  const [showChange, setShowChange] = useState(false);
  const statsQuery = useQuery({
    queryKey: ["analysis-statistics", analysis.id],
    queryFn: () => api.statistics(analysis.id),
  });

  const tone = confidenceTone(analysis.confidence_label);
  const net = analysis.stats.net_water_change_km2 ?? analysis.net_water_change_km2;

  return (
    <div className="space-y-4">
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={analysis.is_synthetic ? "amber" : "emerald"}>
                {analysis.is_synthetic ? "SYNTHETIC DEMO" : "SAMPLE · ATTRIBUTED"}
              </Badge>
              <Badge variant="outline">{analysis.method.replace("_", " ")}</Badge>
              <Badge variant={tone === "emerald" ? "emerald" : tone === "amber" ? "amber" : "danger"}>
                {analysis.confidence_label} processing quality
              </Badge>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {analysis.location_name}
            </h2>
            <p className="mt-1 font-mono text-[10px] text-muted">
              {analysis.before_date} → {analysis.after_date} · analysis #{analysis.id}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={apiUrl(analysis.geojson_url)}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ArrowDownToLine className="size-3.5" /> GeoJSON
            </a>
            <Link
              href={`/insights?analysis=${analysis.id}`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <Sparkles className="size-3.5" /> AI insights
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
          <BeforeAfterSlider
            beforeUrl={analysis.before_preview_url}
            afterUrl={analysis.after_preview_url}
            beforeDate={analysis.before_date}
            afterDate={analysis.after_date}
            isSynthetic={analysis.is_synthetic}
          />
          <div className="grid grid-cols-2 gap-2">
            <Metric
              label="Changed area"
              value={formatNumber(analysis.change_area_km2, 1)}
              unit="km²"
              detail={`${percent(analysis.changed_fraction * 100, 1)} of valid pixels`}
            />
            <Metric
              label="Net water indicator"
              value={signed(net, 1)}
              unit="km²"
              detail={net >= 0 ? "net low-backscatter gain" : "net low-backscatter loss"}
              tone={net >= 0 ? "accent" : "orange"}
            />
            <Metric
              label="Water gain"
              value={formatNumber(analysis.water_gain_km2, 1)}
              unit="km²"
              tone="accent"
              detail="beyond the threshold"
            />
            <Metric
              label="Water loss"
              value={formatNumber(analysis.water_loss_km2, 1)}
              unit="km²"
              tone="orange"
              detail="beyond the threshold"
            />
            <Metric
              label="Mean Δ backscatter"
              value={`${formatNumber(analysis.stats.mean_change_db, 2)}`}
              unit="dB"
              detail="later minus earlier"
            />
            <Metric
              label="Valid coverage"
              value={percent((analysis.stats.valid_coverage || 0) * 100, 1)}
              detail="both scenes valid"
              tone="emerald"
            />
          </div>
        </div>

        {location ? (
          <div className="border-t border-line p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Derived overlays</p>
                <h3 className="mt-1 text-sm font-semibold">Change map</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowWater((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                    showWater
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-line text-muted hover:text-foreground",
                  )}
                >
                  <Droplets className="size-3" /> Water
                </button>
                <button
                  type="button"
                  onClick={() => setShowChange((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                    showChange
                      ? "border-teal/40 bg-teal/10 text-teal"
                      : "border-line text-muted hover:text-foreground",
                  )}
                >
                  <ScanLine className="size-3" /> Backscatter
                </button>
              </div>
            </div>
            <div className="relative h-[320px] overflow-hidden rounded-md border border-line">
              <DynamicMap
                locations={[location]}
                activeAnalysis={analysis}
                selectedLocationSlug={location.slug}
                basemap="satellite"
                layerVisibility={{
                  radar_observations: false,
                  detected_changes: showChange,
                  water_change: showWater,
                  wetland_monitoring: true,
                }}
                className="size-full"
                preview
              />
              <MapStatusHint />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Blue: new low-backscatter water indicator. Orange: lost indicator. Teal/orange:
              backscatter increase/decrease beyond ±{analysis.change_threshold_db.toFixed(1)} dB.
              Not a flood extent.
            </p>
          </div>
        ) : null}
      </div>

      <div className="panel p-5">
        <Tabs defaultValue="overview">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="quality">Quality & limitations</TabsTrigger>
            <TabsTrigger value="method">Method</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div>
              <p className="eyebrow">Automated summary</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-strong">{analysis.summary}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md border border-accent/20 bg-accent/[0.045] p-3.5">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                  <Info className="size-3" /> Interpretation
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-strong">
                  {analysis.interpretation}
                </p>
              </div>
              <div className="rounded-md border border-line bg-surface/60 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    <ShieldAlert className="size-3" /> Confidence
                  </p>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      tone === "emerald" ? "text-emerald" : tone === "amber" ? "text-amber" : "text-danger",
                    )}
                  >
                    {analysis.confidence_label} · {analysis.confidence_score.toFixed(2)}
                  </span>
                </div>
                <Meter value={analysis.confidence_score} tone={tone} className="mt-3" />
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  {analysis.quality.score_meaning}
                </p>
                <div className="mt-3 space-y-1.5 border-t border-line/60 pt-2.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted">Residual noise</span>
                    <span className="font-mono text-foreground">
                      {analysis.quality.difference_noise_db ?? "—"} dB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Grid aligned</span>
                    <span className={analysis.quality.alignment.aligned ? "text-emerald" : "text-danger"}>
                      {analysis.quality.alignment.aligned ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Callout tone="warning" title="What this does not tell you">
              A backscatter change is not proof of flooding or damage. Surface roughness, soil
              moisture, vegetation, tillage, acquisition geometry and speckle can all create a
              similar signature. Independent validation would be required.
            </Callout>
          </TabsContent>

          <TabsContent value="statistics">
            {statsQuery.isError ? (
              <Callout tone="danger" title="Statistics endpoint unavailable">
                {(statsQuery.error as Error).message}
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => statsQuery.refetch()}>
                    Retry statistics
                  </Button>
                </div>
              </Callout>
            ) : (
              <StatTable data={statsQuery.data} fallback={analysis} />
            )}
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Metric label="Quality score" value={analysis.confidence_score.toFixed(2)} detail="coverage + noise + alignment" tone="emerald" />
              <Metric label="Residual noise" value={String(analysis.quality.difference_noise_db ?? "—")} unit="dB" detail="robust MAD estimate" />
              <Metric label="Valid coverage" value={percent((analysis.stats.valid_coverage || 0) * 100, 1)} detail="both scenes" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Processing flags
              </p>
              <ul className="mt-2 space-y-1.5">
                {analysis.quality.flags.map((flag) => (
                  <li key={flag} className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-strong">
                    {analysis.quality.alignment.aligned ? (
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber" />
                    )}
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Limitations
              </p>
              <ul className="mt-2 space-y-1.5">
                {analysis.limitations.map((limitation) => (
                  <li key={limitation} className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-line-strong" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="method" className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Metric label="Method" value={analysis.method.replace("_", " ")} />
              <Metric label="Change threshold" value={`± ${analysis.change_threshold_db.toFixed(1)}`} unit="dB" />
              <Metric label="Water indicator" value={`< ${analysis.water_threshold_db.toFixed(1)}`} unit="dB" />
              <Metric label="Output" value="Stats + PNG + GeoJSON" />
            </div>
            <ol className="space-y-2">
              {[
                "Load both georeferenced rasters and validate nodata / value ranges.",
                "Confirm identical grid, CRS and geotransform before comparison.",
                "Apply a 5×5 median filter as a transparent speckle-reduction screen.",
                "Compute per-pixel dB difference (later minus earlier).",
                "Classify pixels beyond the configurable change threshold.",
                "Derive low-backscatter water-indicator masks and their gain / loss.",
                "Compute spatial statistics, quality metrics and vector outlines.",
                "Return results with source identifiers, provenance and limitations.",
              ].map((step, index) => (
                <li key={step} className="flex gap-2.5 text-[11px] leading-relaxed text-muted-strong">
                  <span className="font-mono text-[10px] text-accent">{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </li>
              ))}
            </ol>
            <pre className="scrollbar-thin overflow-x-auto rounded-md border border-line bg-[#07101c] p-3 font-mono text-[11px] leading-relaxed text-muted-strong">
{`ΔdB = 10 · log10(P_later / P_earlier)
changed = |ΔdB| > ${analysis.change_threshold_db.toFixed(1)} dB
new_water = (later_dB < ${analysis.water_threshold_db.toFixed(1)}) ∧ ¬(earlier_dB < ${analysis.water_threshold_db.toFixed(1)})`}
            </pre>
            <div className="rounded-md border border-line bg-surface/60 p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Source observations
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-2">
                {[analysis.before, analysis.after].map((observation, index) => (
                  <div key={observation.id} className="rounded border border-line bg-surface p-2.5">
                    <p className="text-muted">{index === 0 ? "Earlier" : "Later"}</p>
                    <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-foreground break-all">
                      {observation.external_id}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      {observation.mission} · {observation.polarization}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}