"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Database,
  Layers3,
  MapPinned,
  Radar,
  RefreshCw,
  Satellite,
  Waves,
} from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";
import { ErrorPanel } from "@/components/ui/error-panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { LiveCatalogueCard } from "@/components/dashboard/live-catalogue-card";

export function DashboardView() {
  const query = useQuery({ queryKey: queryKeys.dashboard, queryFn: api.dashboard });
  const sources = useQuery({ queryKey: queryKeys.dataSources, queryFn: api.dataSources });
  const data = query.data;
  const analyses = data?.recent_analyses || [];

  return (
    <div className="container-page py-8 lg:py-10">
      <PageHeader
        eyebrow="Console"
        title="Platform telemetry"
        description="Operational read-out for the live platform: catalogue volume from ASF, monitored areas, cached comparisons, and service health."
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
            <Link href="/map" className={cn(buttonVariants({ size: "sm" }))}>
              Earth Explorer <ArrowRight className="size-3.5" />
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
          <Skeleton className="h-[420px] w-full rounded-lg" />
        </div>
      ) : null}

      {data ? (
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={MapPinned}
              label="Monitored area"
              value={formatNumber(data.stats.area_in_latest_analyses_km2, 0)}
              unit="km²"
              hint={`${data.stats.locations} real bounding boxes`}
              tone="teal"
            />
            <StatCard
              icon={Satellite}
              label="Catalogue · 30 d"
              value={String(data.stats.observations)}
              hint="NISAR records, worldwide"
              tone="accent"
            />
            <StatCard
              icon={Layers3}
              label="Cached comparisons"
              value={String(data.stats.analyses)}
              hint="Sentinel-1 pairs measured here"
              tone="violet"
            />
            <StatCard
              icon={Radar}
              label="Changed area"
              value={formatNumber(data.stats.latest_change_area_km2, 0)}
              unit="km²"
              hint={
                data.stats.analyses
                  ? `Water gain ${formatNumber(data.stats.latest_water_gain_km2, 0)} km²`
                  : "Run a comparison to populate"
              }
              tone="emerald"
            />
          </div>

          <LiveCatalogueCard />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <MapPinned className="size-3.5 text-teal" />
                  <p className="text-xs font-semibold text-foreground">Monitoring areas</p>
                </div>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-accent hover:text-accent-soft"
                >
                  Open explorer <ArrowUpRight className="size-3" />
                </Link>
              </div>
              <div className="divide-y divide-line/60">
                {(data.locations || []).map((location) => (
                  <div
                    key={location.slug}
                    className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{location.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted">
                        {location.bbox.map((value) => value.toFixed(2)).join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{location.observation_count} NISAR</Badge>
                      {location.latest_analysis ? (
                        <Badge variant="emerald">cached</Badge>
                      ) : (
                        <Badge variant="muted">no comparison</Badge>
                      )}
                      <Link
                        href={`/live?area=${location.slug}`}
                        className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft"
                      >
                        Compare <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-3.5 text-accent" />
                  <p className="text-xs font-semibold text-foreground">Latest comparisons</p>
                </div>
                <Badge variant="outline">Sentinel-1</Badge>
              </div>
              {analyses.length ? (
                <div className="divide-y divide-line/60">
                  {analyses.map((analysis) => (
                    <div key={analysis.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">
                          {analysis.location_name}
                        </p>
                        <Badge variant="emerald">{analysis.confidence_label}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-muted">
                        {formatDate(analysis.before_date)} → {formatDate(analysis.after_date)}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted-strong">
                        changed {formatNumber(analysis.changed_fraction * 100, 1)}% ·{" "}
                        {formatNumber(analysis.change_area_km2, 1)} km² · net water{" "}
                        {analysis.net_water_change_km2 >= 0 ? "+" : ""}
                        {formatNumber(analysis.net_water_change_km2, 2)} km²
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 px-4 py-8 text-center">
                  <p className="text-xs text-muted">
                    No comparison has run on this instance yet.
                  </p>
                  <Link href="/live" className={cn(buttonVariants({ size: "sm" }))}>
                    Open the change lab <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </section>
          </div>

          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <Satellite className="size-3.5 text-accent" />
                <p className="text-xs font-semibold text-foreground">Catalogue records</p>
              </div>
              <Badge variant="emerald">live</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b border-line bg-surface/60 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    <th className="px-4 py-2.5 font-normal">Acquired</th>
                    <th className="px-4 py-2.5 font-normal">Product</th>
                    <th className="px-4 py-2.5 font-normal">Orbit</th>
                    <th className="px-4 py-2.5 font-normal">Track / frame</th>
                    <th className="px-4 py-2.5 font-normal">Polarization</th>
                    <th className="px-4 py-2.5 text-right font-normal">Browse</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_observations.slice(0, 8).map((observation) => (
                    <tr key={observation.id} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-strong">
                        {formatDate(observation.acquired_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="teal" className="text-[10px]">
                          {observation.product_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted">
                        {observation.acquisition_mode}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted">
                        {String(observation.provenance?.track ?? "—")} /{" "}
                        {String(observation.provenance?.frame ?? "—")}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted">
                        {observation.polarization}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {observation.preview_url ? (
                          <a
                            href={observation.preview_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:text-accent-soft"
                          >
                            open <ArrowUpRight className="size-3" />
                          </a>
                        ) : (
                          <span className="font-mono text-[10px] text-muted">none</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-4 py-2.5 text-[10px] text-muted">
              Catalogue records only. Product download requires NASA Earthdata Login and is not
              performed here.
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <Database className="size-3.5 text-accent" />
                  <p className="text-xs font-semibold text-foreground">Service health</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald">
                  read-only
                </span>
              </div>
              <div className="divide-y divide-line/60">
                {(sources.data?.sources || []).map((source) => (
                  <div
                    key={source.name}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground">{source.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{source.role}</p>
                    </div>
                    <Badge variant={source.available ? "emerald" : "muted"}>
                      {source.available ? "live" : "idle"}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-4">
              <div className="flex items-center gap-2">
                <Waves className="size-3.5 text-teal" />
                <p className="text-xs font-semibold text-foreground">Notes</p>
              </div>
              <ul className="mt-3 space-y-2">
                {data.notes.map((note) => (
                  <li key={note} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}