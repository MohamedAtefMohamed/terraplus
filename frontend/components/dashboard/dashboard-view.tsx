"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Layers3,
  MapPinned,
  Radar,
  RefreshCw,
  Satellite,
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
  const data = query.data;
  const analyses = data?.recent_analyses || [];

  return (
    <div className="container-page py-8 lg:py-10">
      <PageHeader
        eyebrow="Console"
        title="Surface change overview"
        description="Every number here comes from a live source: NISAR catalogue records from ASF and Sentinel-1 comparisons cached from the live lab."
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
            <Link href="/live" className={cn(buttonVariants({ size: "sm" }))}>
              Run a comparison <ArrowRight className="size-3.5" />
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
          <LiveCatalogueCard />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={MapPinned}
              label="Monitoring area"
              value={formatNumber(data.stats.area_in_latest_analyses_km2, 0)}
              unit="km2"
              hint={`${data.stats.locations} real bounding boxes`}
              tone="emerald"
            />
            <StatCard
              icon={Satellite}
              label="NISAR records · 30 days"
              value={String(data.stats.observations)}
              hint="ASF DAAC catalogue, worldwide"
              tone="accent"
            />
            <StatCard
              icon={Layers3}
              label="Cached comparisons"
              value={String(data.stats.analyses)}
              hint="Sentinel-1 pairs computed in the live lab"
              tone="teal"
            />
            <StatCard
              icon={Radar}
              label="Changed area"
              value={formatNumber(data.stats.latest_change_area_km2, 0)}
              unit="km2"
              hint={
                data.stats.analyses
                  ? `Water gain ${formatNumber(data.stats.latest_water_gain_km2, 0)} km2`
                  : "Run a comparison to populate this"
              }
              tone="violet"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <MapPinned className="size-3.5 text-teal" />
                  <h2 className="text-xs font-semibold text-foreground">Monitoring areas</h2>
                </div>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft"
                >
                  Open map <ArrowUpRight className="size-3" />
                </Link>
              </div>
              <div className="divide-y divide-line/60">
                {data.locations.map((location) => (
                  <div
                    key={location.slug}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{location.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {location.region} · {location.bbox.map((value) => value.toFixed(2)).join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{location.observation_count} NISAR</Badge>
                      {location.latest_analysis ? (
                        <Badge variant="emerald">comparison cached</Badge>
                      ) : (
                        <Badge variant="muted">no comparison yet</Badge>
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
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-3.5 text-accent" />
                  <h2 className="text-xs font-semibold text-foreground">Latest comparisons</h2>
                </div>
                <Badge variant="outline">Sentinel-1</Badge>
              </div>
              {analyses.length ? (
                <div className="divide-y divide-line/60">
                  {analyses.map((analysis) => (
                    <div key={analysis.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">
                          {analysis.location_name}
                        </p>
                        <Badge variant="emerald">{analysis.confidence_label}</Badge>
                      </div>
                      <p className="mt-1 text-[10px] text-muted">
                        {formatDate(analysis.before_date)} to {formatDate(analysis.after_date)}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-muted-strong">
                        changed {formatNumber(analysis.changed_fraction * 100, 1)}% ·{" "}
                        {formatNumber(analysis.change_area_km2, 1)} km2 · net water{" "}
                        {analysis.net_water_change_km2 >= 0 ? "+" : ""}
                        {formatNumber(analysis.net_water_change_km2, 2)} km2
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 px-5 py-8 text-center">
                  <p className="text-xs text-muted">
                    No comparison has been run in this instance yet.
                  </p>
                  <Link href="/live" className={cn(buttonVariants({ size: "sm" }))}>
                    Open the live lab <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </section>
          </div>

          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Satellite className="size-3.5 text-teal" />
                <h2 className="text-xs font-semibold text-foreground">NISAR records</h2>
              </div>
              <Badge variant="emerald">live</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-line/70 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    <th className="px-5 py-2.5 font-normal">Acquired</th>
                    <th className="px-3 py-2.5 font-normal">Product</th>
                    <th className="px-3 py-2.5 font-normal">Orbit</th>
                    <th className="px-3 py-2.5 font-normal">Track / frame</th>
                    <th className="px-3 py-2.5 font-normal">Polarization</th>
                    <th className="px-3 py-2.5 text-right font-normal">Browse</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_observations.slice(0, 8).map((observation) => (
                    <tr key={observation.id} className="border-b border-line/50 last:border-0">
                      <td className="px-5 py-2.5 text-[11px] text-muted-strong">
                        {formatDate(observation.acquired_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="teal" className="text-[10px]">
                          {observation.product_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted">
                        {observation.acquisition_mode}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted">
                        {String(observation.provenance?.track ?? "—")} /{" "}
                        {String(observation.provenance?.frame ?? "—")}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-muted">
                        {observation.polarization}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {observation.preview_url ? (
                          <a
                            href={observation.preview_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent-soft"
                          >
                            open <ArrowUpRight className="size-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted">none</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-5 py-2.5 text-[10px] text-muted">
              Catalogue records only. Product download requires NASA Earthdata Login and is not
              performed here.
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {data.notes.map((note) => (
              <p key={note} className="panel-flat p-3 text-[11px] leading-relaxed text-muted">
                {note}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}