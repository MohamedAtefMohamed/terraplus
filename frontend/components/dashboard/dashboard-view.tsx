"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Droplets,
  Gauge,
  Layers3,
  MapPinned,
  RefreshCw,
  Satellite,
  ShieldCheck,
} from "lucide-react";
import { api, assetUrl, queryKeys } from "@/lib/api";
import { cn, formatDate, formatNumber, percent } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";
import { Callout } from "@/components/ui/callout";
import { ErrorPanel } from "@/components/ui/error-panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardMapCard } from "@/components/dashboard/dashboard-map-card";
import { DataModePanel } from "@/components/dashboard/data-mode-panel";
import { AnalysisCard } from "@/components/analysis/analysis-card";

export function DashboardView() {
  const query = useQuery({ queryKey: queryKeys.dashboard, queryFn: api.dashboard });
  const data = query.data;

  return (
    <div className="container-page py-8 lg:py-10">
      <PageHeader
        eyebrow="Intelligence console"
        title="Surface change overview"
        description="A working view of the TerraPulse demonstration dataset: three monitored areas, paired radar observations and persisted change analyses."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={cn("size-3.5", query.isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Link href="/analysis" className={cn(buttonVariants({ size: "sm" }))}>
              New analysis <ArrowRight className="size-3.5" />
            </Link>
          </>
        }
      />

      {query.isError ? (
        <ErrorPanel
          message={(query.error as Error).message}
          onRetry={() => query.refetch()}
          className="mt-4"
        />
      ) : null}

      {query.isLoading ? (
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <CardSkeleton key={key} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Skeleton className="h-[460px] w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-56 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </div>
      ) : null}

      {data ? (
        <div className="mt-4 space-y-5">
          {data.data_status.fallback_reason ? (
            <Callout tone="warning" title="Configured data mode fallback">
              {data.data_status.fallback_reason}
            </Callout>
          ) : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={MapPinned}
              label="Area in latest analyses"
              value={formatNumber(
                data.stats.area_in_latest_analyses_km2 ?? data.stats.demo_area_monitored_km2,
                0,
              )}
              unit="km²"
              hint={`${data.stats.locations} monitored regions with real coordinates`}
              tone="emerald"
            />
            <StatCard
              icon={Layers3}
              label="Observations"
              value={String(data.stats.observations)}
              hint="Four synthetic acquisition dates per area"
              tone="accent"
            />
            <StatCard
              icon={Activity}
              label="Latest change area"
              value={formatNumber(data.stats.latest_change_area_km2, 0)}
              unit="km²"
              hint={`Water gain ${formatNumber(data.stats.latest_water_gain_km2, 0)} km² across latest analyses`}
              tone="teal"
            />
            <StatCard
              icon={Gauge}
              label="Average processing quality"
              value={percent(data.stats.average_confidence * 100, 0)}
              hint="Quality of the comparison, not event probability"
              tone="violet"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-4">
              <DashboardMapCard locations={data.locations} />

              <section>
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <p className="eyebrow">Analyses</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">Recent results</h2>
                  </div>
                  <Link
                    href="/insights"
                    className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft"
                  >
                    Open insights <ArrowUpRight className="size-3" />
                  </Link>
                </div>
                <div className="grid gap-3">
                  {data.recent_analyses.slice(0, 4).map((analysis) => (
                    <AnalysisCard key={analysis.id} analysis={analysis} />
                  ))}
                </div>
              </section>

              <section className="panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="size-3.5 text-accent" />
                    <h2 className="text-xs font-semibold text-foreground">Recent observations</h2>
                  </div>
                  <Badge variant="amber">SYNTHETIC</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left">
                    <thead>
                      <tr className="border-b border-line/70 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        <th className="px-5 py-2.5 font-normal">Area</th>
                        <th className="px-3 py-2.5 font-normal">Acquired</th>
                        <th className="px-3 py-2.5 font-normal">Source</th>
                        <th className="px-3 py-2.5 font-normal">Pol.</th>
                        <th className="px-3 py-2.5 text-right font-normal">Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_observations.slice(0, 6).map((observation) => (
                        <tr key={observation.id} className="border-b border-line/50 last:border-0">
                          <td className="px-5 py-2.5">
                            <p className="text-[11px] font-medium text-foreground">
                              {observation.location_name}
                            </p>
                            <p className="font-mono text-[10px] text-muted">
                              {observation.external_id}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-muted-strong">
                            {formatDate(observation.acquired_at)}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={observation.is_synthetic ? "amber" : "emerald"}
                              className="text-[10px]"
                            >
                              {observation.is_synthetic ? "DEMO" : "SAMPLE"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[10px] text-muted">
                            {observation.polarization}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {observation.preview_url ? (
                              <img
                                src={assetUrl(observation.preview_url) || ""}
                                alt=""
                                className="ml-auto h-8 w-14 rounded border border-line object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <DataModePanel data={data.data_status} />

              <div className="panel p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="size-3.5 text-accent" />
                    <h3 className="text-xs font-semibold">Water-indicator signals</h3>
                  </div>
                  <span className="font-mono text-[10px] text-muted">DEMO</span>
                </div>
                <div className="mt-3 space-y-3">
                  {data.environmental_indicators.map((indicator) => {
                    const max = Math.max(
                      ...data.environmental_indicators.map((item) => Math.abs(item.value)),
                      1,
                    );
                    return (
                      <div key={indicator.location_slug}>
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/timeline?location=${indicator.location_slug}`}
                            className="truncate text-[11px] text-muted-strong hover:text-accent"
                          >
                            {indicator.location_name}
                          </Link>
                          <span
                            className={cn(
                              "font-mono text-[11px]",
                              indicator.direction === "gain" ? "text-accent" : "text-orange",
                            )}
                          >
                            {indicator.value >= 0 ? "+" : ""}
                            {formatNumber(indicator.value, 0)} km²
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              indicator.direction === "gain"
                                ? "bg-gradient-to-r from-accent to-teal"
                                : "bg-gradient-to-r from-orange to-amber",
                            )}
                            style={{ width: `${Math.min(100, (Math.abs(indicator.value) / max) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-muted">
                          {indicator.period} · {indicator.confidence} quality
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 border-t border-line/70 pt-3 text-[11px] leading-relaxed text-muted">
                  Low-backscatter indicator change only. Not a flood extent or damage estimate.
                </p>
              </div>

              <div className="panel p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Satellite className="size-3.5 text-emerald" />
                    <h3 className="text-xs font-semibold">NISAR integration</h3>
                  </div>
                  <Badge variant={data.nisar.discovery.enabled ? "emerald" : "muted"}>
                    {data.nisar.discovery.enabled ? "Discovery on" : "Discovery off"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2.5 text-[11px] leading-relaxed">
                  <div className="flex items-center justify-between border-b border-line/60 pb-2">
                    <span className="text-muted">Granule metadata</span>
                    <span className="text-emerald">ASF adapter</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-line/60 pb-2">
                    <span className="text-muted">Product download</span>
                    <span className="text-amber">Earthdata required</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-line/60 pb-2">
                    <span className="text-muted">Calibrated processing</span>
                    <span className="text-muted">Not in MVP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Earthdata credentials</span>
                    <span
                      className={
                        data.nisar.discovery.earthdata_credentials_configured
                          ? "text-emerald"
                          : "text-muted"
                      }
                    >
                      {data.nisar.discovery.earthdata_credentials_configured
                        ? "Configured"
                        : "Not configured"}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted">
                  {data.nisar.mission.status} {data.nisar.mission.bands}
                </p>
                <Link
                  href="/map?panel=nisar"
                  className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-soft"
                >
                  Search live NISAR metadata <ArrowUpRight className="size-3" />
                </Link>
              </div>

              <div className="panel p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-emerald" />
                  <h3 className="text-xs font-semibold">Method guardrails</h3>
                </div>
                <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted">
                  <li className="flex gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-emerald" />
                    Processing quality is reported separately from event probability.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-emerald" />
                    Thresholds are configurable screens, not universal constants.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-emerald" />
                    Displacement methods are never run on unsuitable products.
                  </li>
                </ul>
                <Link
                  href="/methodology"
                  className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-soft"
                >
                  Methodology <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </aside>
          </div>

          <Callout tone="info" title="Demonstration data notice">
            All analyses on this dashboard are computed from the TerraPulse synthetic demo
            dataset. Coordinates are real; radar backscatter is generated. Use the live NISAR
            discovery panel for real granule metadata.
          </Callout>
        </div>
      ) : null}
    </div>
  );
}