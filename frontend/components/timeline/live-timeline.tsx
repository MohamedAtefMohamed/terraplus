"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  Radar,
  Satellite,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LiveTimeline() {
  const [slug, setSlug] = useState("atchafalaya");
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: api.locations });
  const timelineQuery = useQuery({
    queryKey: queryKeys.timeline(slug),
    queryFn: () => api.timeline(slug),
  });

  const data = timelineQuery.data;

  useEffect(() => {
    if (!locationsQuery.data?.length) return;
    if (!locationsQuery.data.some((item) => item.slug === slug)) {
      setSlug(locationsQuery.data[0].slug);
    }
  }, [locationsQuery.data, slug]);

  const months = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const row of data?.observations || []) {
      const key = row.date.slice(0, 7);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);
  const maxCount = Math.max(1, ...months.map(([, count]) => count));

  return (
    <div className="container-page py-8 lg:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="eyebrow">Acquisition history</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
            Every pass we can see
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            Sentinel-1 acquisitions from the Earth Search index and NISAR catalogue records from
            ASF, for one monitoring area over the last 180 days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={slug} onValueChange={setSlug}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select an area" />
            </SelectTrigger>
            <SelectContent>
              {(locationsQuery.data || []).map((item) => (
                <SelectItem key={item.slug} value={item.slug}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link
            href={`/live?area=${slug}`}
            className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft"
          >
            Compare <ArrowRight className="size-3" />
          </Link>
        </div>
      </header>

      {timelineQuery.isError ? (
        <ErrorPanel
          className="mt-6"
          message={(timelineQuery.error as Error).message}
          onRetry={() => timelineQuery.refetch()}
        />
      ) : null}

      {timelineQuery.isLoading ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : null}

      {data ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Sentinel-1 passes", value: String(data.observations.length) },
              { label: "NISAR records", value: String(data.nisar?.length || 0) },
              {
                label: "Latest pass",
                value: data.observations.length
                  ? formatDate(data.observations[data.observations.length - 1].acquired_at)
                  : "none",
              },
              {
                label: "Comparisons",
                value: String(data.comparisons.length),
              },
            ].map((item) => (
              <div key={item.label} className="panel p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {item.label}
                </p>
                <p className="metric-value mt-1.5 text-lg font-semibold text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-3.5 text-accent" />
                <h2 className="text-xs font-semibold text-foreground">Passes per month</h2>
              </div>
              <span className="font-mono text-[10px] text-muted">last 180 days</span>
            </div>
            {months.length ? (
              <div className="mt-4 flex h-24 items-end gap-2">
                {months.map(([month, count]) => (
                  <div key={month} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-accent/25 to-accent/70"
                      style={{ height: `${Math.max(6, (count / maxCount) * 72)}px` }}
                      title={`${count} passes`}
                    />
                    <span className="font-mono text-[9px] text-muted">{month.slice(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted">No passes in this window.</p>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Satellite className="size-3.5 text-teal" />
                  <h2 className="text-xs font-semibold text-foreground">NISAR catalogue</h2>
                </div>
                <Badge variant="emerald">live</Badge>
              </div>
              <div className="max-h-[420px] divide-y divide-line/60 overflow-y-auto scrollbar-thin">
                {(data.nisar || []).map((granule) => (
                  <a
                    key={granule.id}
                    href={granule.download_url || "https://search.asf.alaska.edu/"}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]"
                  >
                    {granule.browse_thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={granule.browse_thumbnail}
                        alt=""
                        className="size-10 rounded border border-line object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid size-10 place-items-center rounded border border-line">
                        <Radar className="size-3.5 text-muted" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-foreground">
                        {formatDate(granule.start)}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted">
                        {granule.product_level || "L1"} · {granule.flight_direction || "orbit"}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-muted">
                      track {String(granule.track ?? "—")}
                    </span>
                  </a>
                ))}
              </div>
            </section>

            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Timer className="size-3.5 text-accent" />
                  <h2 className="text-xs font-semibold text-foreground">Sentinel-1 passes</h2>
                </div>
                <Badge variant="outline">GRD · VV</Badge>
              </div>
              <div className="max-h-[420px] divide-y divide-line/60 overflow-y-auto scrollbar-thin">
                {data.observations.length ? (
                  [...data.observations].reverse().map((row) => (
                    <div key={row.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-[11px] font-medium text-foreground">
                          {formatDate(row.acquired_at)}
                        </p>
                        <p className="font-mono text-[10px] text-muted">
                          orbit {String(row.metrics?.relative_orbit ?? "—")} ·{" "}
                          {String(row.metrics?.orbit_state ?? "")} ·{" "}
                          {row.polarization}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-muted">
                        {row.days_since_previous !== null
                          ? `${row.days_since_previous} d gap`
                          : "first"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="px-5 py-6 text-xs text-muted">No passes in this window.</p>
                )}
              </div>
            </section>
          </div>

          {data.comparisons.length ? (
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-foreground">Latest comparison</h2>
                <Link
                  href={`/live?area=${slug}`}
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft"
                >
                  Open in live lab <ArrowRight className="size-3" />
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Period", value: `${data.comparisons[0].before_date} → ${data.comparisons[0].after_date}` },
                  { label: "Changed", value: `${formatNumber(data.comparisons[0].change_area_km2, 1)} km2` },
                  { label: "Water gain", value: `${formatNumber(data.comparisons[0].water_gain_km2, 2)} km2` },
                  { label: "Water loss", value: `${formatNumber(data.comparisons[0].water_loss_km2, 2)} km2` },
                ].map((item) => (
                  <div key={item.label} className="panel-flat p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {item.label}
                    </p>
                    <p className={cn("mt-1 text-sm font-semibold text-foreground")}>{item.value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <Callout tone="info" title="No comparison cached for this area">
              The timeline lists catalogued acquisitions. Run a comparison in the live lab to add
              measured change numbers here.
            </Callout>
          )}
        </div>
      ) : null}
    </div>
  );
}