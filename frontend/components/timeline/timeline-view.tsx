"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDot,
  Clock3,
  Droplets,
  Info,
  LineChart,
  MapPin,
  Satellite,
  Waves,
} from "lucide-react";
import type { TimelineObservation } from "@/types/api";
import { api, assetUrl, queryKeys } from "@/lib/api";
import { cn, formatDate, formatNumber, percent } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeBarChart, WaterTrendChart } from "@/components/charts/timeline-charts";

function MetricPill({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-line bg-surface/60 px-3 py-2">
      <Icon className="size-3.5 text-accent" />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
        <p className="mt-0.5 text-[11px] font-medium text-foreground">
          {value}
          {unit ? <span className="ml-1 text-[10px] font-normal text-muted">{unit}</span> : null}
        </p>
      </div>
    </div>
  );
}

export function TimelineView() {
  const searchParams = useSearchParams();
  const initialLocation = searchParams.get("location");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialLocation);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: api.locations });

  useEffect(() => {
    if (!selectedSlug && locationsQuery.data?.length) {
      setSelectedSlug(initialLocation || locationsQuery.data[0].slug);
    }
  }, [initialLocation, locationsQuery.data, selectedSlug]);

  useEffect(() => {
    setSelectedId(null);
  }, [selectedSlug]);

  const timelineQuery = useQuery({
    queryKey: queryKeys.timeline(selectedSlug || ""),
    queryFn: () => api.timeline(selectedSlug as string),
    enabled: Boolean(selectedSlug),
  });

  const timeline = timelineQuery.data;

  useEffect(() => {
    if (timeline?.observations.length && selectedId === null) {
      setSelectedId(timeline.observations[timeline.observations.length - 1].id);
    }
  }, [timeline, selectedId]);

  const selectedObservation: TimelineObservation | null = useMemo(() => {
    if (!timeline) return null;
    return (
      timeline.observations.find((observation) => observation.id === selectedId) ||
      timeline.observations[timeline.observations.length - 1] ||
      null
    );
  }, [timeline, selectedId]);

  const trendData = useMemo(
    () =>
      (timeline?.observations || []).map((observation) => ({
        date: observation.date.slice(5),
        fullDate: observation.date,
        water: observation.metrics?.water_fraction ?? null,
        meanDb: observation.metrics?.mean_db ?? null,
      })),
    [timeline],
  );

  const comparisonData = useMemo(
    () =>
      (timeline?.comparisons || [])
        .filter((comparison) => comparison.status === "completed")
        .map((comparison) => ({
          range: `${comparison.before_date.slice(5)} → ${comparison.after_date.slice(5)}`,
          gain: comparison.water_gain_km2 || 0,
          loss: comparison.water_loss_km2 || 0,
          changed: comparison.change_area_km2 || 0,
          confidence: comparison.confidence || "",
        })),
    [timeline],
  );

  const waterValues = (timeline?.observations || [])
    .map((observation) => observation.metrics?.water_fraction)
    .filter((value): value is number => typeof value === "number");
  const peakWater = waterValues.length ? Math.max(...waterValues) : null;
  const latestWater = waterValues.length ? waterValues[waterValues.length - 1] : null;

  const selectLocation = (slug: string) => {
    setSelectedSlug(slug);
    setSelectedId(null);
  };

  return (
    <div className="container-page py-8 lg:py-10">
      <PageHeader
        eyebrow="Temporal analysis"
        title="How the signal evolves"
        description="Follow a demonstration area through its observation record. Compare consecutive scenes and see whether the low-backscatter water indicator is expanding, receding or mixed."
        actions={
          <>
            <Badge variant={timeline?.is_synthetic === false ? "emerald" : "amber"}>
              {timeline?.is_synthetic === false ? "SAMPLE TIMELINE" : "SYNTHETIC TIMELINE"}
            </Badge>
            <Link
              href={`/analysis?location=${selectedSlug || ""}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Open comparison <ArrowRight className="size-3.5" />
            </Link>
          </>
        }
      />

      <div className="mt-2 flex flex-wrap gap-2">
        {(locationsQuery.data || []).map((location) => (
          <button
            key={location.slug}
            type="button"
            onClick={() => selectLocation(location.slug)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
              location.slug === selectedSlug
                ? "border-accent/40 bg-accent/[0.07]"
                : "border-line bg-surface/50 hover:border-line-strong",
            )}
          >
            <MapPin
              className={cn(
                "size-3.5",
                location.slug === selectedSlug ? "text-accent" : "text-muted",
              )}
            />
            <span>
              <span className="block text-[11px] font-medium text-foreground">{location.name}</span>
              <span className="block font-mono text-[10px] text-muted">
                {location.observation_count} observations · {location.country}
              </span>
            </span>
          </button>
        ))}
      </div>

      {locationsQuery.isError ? (
        <ErrorPanel
          message={(locationsQuery.error as Error).message}
          onRetry={() => locationsQuery.refetch()}
          className="mt-4"
        />
      ) : null}

      {timelineQuery.isLoading ? (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-[320px] rounded-lg" />
            <Skeleton className="h-[320px] rounded-lg" />
          </div>
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : null}

      {timelineQuery.isError ? (
        <ErrorPanel
          message={(timelineQuery.error as Error).message}
          onRetry={() => timelineQuery.refetch()}
          className="mt-4"
        />
      ) : null}

      {timeline ? (
        <div className="mt-4 space-y-4">
          <div className="panel p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="teal">{timeline.location.focus}</Badge>
                  <Badge variant={timeline.is_synthetic ? "amber" : "emerald"}>
                    {timeline.is_synthetic ? "DEMO DATA" : "SAMPLE DATA"}
                  </Badge>
                  <span className="font-mono text-[10px] text-muted">
                    {timeline.location.center_lat.toFixed(2)}°,{" "}
                    {timeline.location.center_lon.toFixed(2)}°
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {timeline.location.name}
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  {timeline.location.region} · {timeline.location.country}.{" "}
                  {timeline.location.monitoring_note}
                </p>
                <p className="mt-3 rounded-md border border-accent/20 bg-accent/[0.045] px-3 py-2 text-[11px] leading-relaxed text-muted-strong">
                  {timeline.trend_summary}
                </p>
              </div>
              <div className="grid grid-cols-1 shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                <MetricPill
                  icon={CalendarDays}
                  label="Date range"
                  value={
                    timeline.observations.length
                      ? `${formatDate(timeline.observations[0].date, { month: "short", year: "numeric" })} – ${formatDate(timeline.observations[timeline.observations.length - 1].date, { month: "short", year: "numeric" })}`
                      : "—"
                  }
                />
                <MetricPill
                  icon={Satellite}
                  label="Observations"
                  value={String(timeline.observations.length)}
                />
                <MetricPill
                  icon={Droplets}
                  label="Peak water indicator"
                  value={percent(peakWater, 1)}
                />
                <MetricPill
                  icon={Waves}
                  label="Latest indicator"
                  value={percent(latestWater, 1)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LineChart className="size-3.5 text-accent" />
                  <h3 className="text-xs font-semibold text-foreground">Water indicator over time</h3>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-accent" /> water %
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-teal" /> mean dB
                  </span>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-muted">
                Low-backscatter fraction per demonstration scene, with mean backscatter on the
                secondary axis.
              </p>
              <div className="mt-2">
                <WaterTrendChart data={trendData} />
              </div>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChartNoAxesCombined className="size-3.5 text-teal" />
                  <h3 className="text-xs font-semibold text-foreground">Consecutive change</h3>
                </div>
                <Badge variant="outline">{comparisonData.length} pairs</Badge>
              </div>
              <p className="mt-1 text-[10px] text-muted">
                Water-indicator gain and loss between adjacent observations.
              </p>
              {comparisonData.length ? (
                <div className="mt-2">
                  <ChangeBarChart data={comparisonData} />
                </div>
              ) : (
                <EmptyState
                  icon={Clock3}
                  title="No adjacent comparisons"
                  description="At least two valid observations are needed for a change series."
                  className="mt-4"
                />
              )}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock3 className="size-3.5 text-accent" />
                <h3 className="text-xs font-semibold text-foreground">Observation timeline</h3>
              </div>
              <span className="font-mono text-[10px] text-muted">
                select a node to inspect
              </span>
            </div>
            <div className="scrollbar-thin mt-5 overflow-x-auto pb-2">
              <div className="relative flex min-w-[520px] items-start justify-between gap-2 px-2">
                <span className="absolute left-4 right-4 top-[15px] h-px bg-gradient-to-r from-accent/50 via-line-strong to-accent/30" />
                {timeline.observations.map((observation) => {
                  const active = selectedObservation?.id === observation.id;
                  return (
                    <button
                      key={observation.id}
                      type="button"
                      onClick={() => setSelectedId(observation.id)}
                      className="relative z-10 flex min-w-[96px] flex-1 flex-col items-center gap-2"
                    >
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border transition-colors",
                          active
                            ? "border-accent bg-[#0d2134] text-accent shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                            : "border-line-strong bg-surface text-muted hover:border-accent/40",
                        )}
                      >
                        <CircleDot className="size-3.5" />
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          active ? "text-accent" : "text-muted",
                        )}
                      >
                        {formatDate(observation.date, { month: "short", day: "2-digit" })}
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        {observation.metrics ? percent(observation.metrics.water_fraction, 0) : "—"}
                      </span>
                      <Badge
                        variant={
                          observation.status !== "available"
                            ? "danger"
                            : observation.is_synthetic
                              ? "amber"
                              : "emerald"
                        }
                        className="text-[10px]"
                      >
                        {observation.status !== "available"
                          ? "N/A"
                          : observation.is_synthetic
                            ? "DEMO"
                            : "SAMPLE"}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedObservation ? (
              <div className="mt-4 grid grid-cols-1 gap-4 rounded-md border border-line bg-surface/55 p-3 sm:grid-cols-[190px_1fr]">
                <img
                  src={assetUrl(selectedObservation.preview_url) || ""}
                  alt={`Demo backscatter preview for ${selectedObservation.date}`}
                  className="aspect-[4/3] w-full rounded border border-line object-cover"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(selectedObservation.date)}
                    </p>
                    <Badge variant={selectedObservation.is_synthetic ? "amber" : "emerald"}>
                      {selectedObservation.is_synthetic ? "SYNTHETIC" : "SAMPLE"}
                    </Badge>
                    {selectedObservation.days_since_previous !== null ? (
                      <span className="font-mono text-[10px] text-muted">
                        +{selectedObservation.days_since_previous} d since previous
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                        Water indicator
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-accent">
                        {percent(selectedObservation.metrics?.water_fraction, 1)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                        Mean dB
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {formatNumber(selectedObservation.metrics?.mean_db, 2)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                        Valid coverage
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-emerald">
                        {percent((selectedObservation.metrics?.valid_coverage || 0) * 100, 1)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                        Polarization
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {selectedObservation.polarization}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/analysis?location=${timeline.location.slug}&before=${selectedObservation.id}`}
                      className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
                    >
                      Compare from this scene <ArrowRight className="size-3" />
                    </Link>
                    <span className="font-mono text-[10px] text-muted">
                      {selectedObservation.product_type}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-3.5 text-accent" />
                  <h3 className="text-xs font-semibold">Observation record</h3>
                </div>
                <span className="font-mono text-[10px] text-muted">availability</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-line/70 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
                      <th className="px-4 py-2.5 font-normal">Date</th>
                      <th className="px-3 py-2.5 font-normal">Gap</th>
                      <th className="px-3 py-2.5 font-normal">Water</th>
                      <th className="px-3 py-2.5 font-normal">Mean dB</th>
                      <th className="px-3 py-2.5 font-normal">Coverage</th>
                      <th className="px-4 py-2.5 text-right font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.observations.map((observation) => (
                      <tr
                        key={observation.id}
                        onClick={() => setSelectedId(observation.id)}
                        className={cn(
                          "cursor-pointer border-b border-line/50 transition-colors last:border-0 hover:bg-white/[0.025]",
                          observation.id === selectedObservation?.id && "bg-accent/[0.035]",
                        )}
                      >
                        <td className="px-4 py-2.5 text-[10px] text-foreground">
                          {formatDate(observation.date)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-muted">
                          {observation.days_since_previous !== null
                            ? `${observation.days_since_previous}d`
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-accent">
                          {percent(observation.metrics?.water_fraction, 1)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-muted-strong">
                          {formatNumber(observation.metrics?.mean_db, 2)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-muted-strong">
                          {percent((observation.metrics?.valid_coverage || 0) * 100, 1)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge
                            variant={
                              observation.status !== "available"
                                ? "danger"
                                : observation.is_synthetic
                                  ? "amber"
                                  : "emerald"
                            }
                            className="text-[10px]"
                          >
                            {observation.status !== "available"
                              ? "UNAVAILABLE"
                              : observation.is_synthetic
                                ? "DEMO"
                                : "SAMPLE"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChartNoAxesCombined className="size-3.5 text-teal" />
                  <h3 className="text-xs font-semibold">Change pairs</h3>
                </div>
                <Badge variant="outline">{timeline.comparisons.length}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {timeline.comparisons.map((comparison) => (
                  <div
                    key={`${comparison.before_id}-${comparison.after_id}`}
                    className="rounded-md border border-line bg-surface/50 p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[10px] text-muted">
                        {comparison.before_date} → {comparison.after_date}
                      </p>
                      {comparison.status === "completed" ? (
                        <Badge variant="emerald" className="text-[10px]">
                          {comparison.confidence}
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="text-[10px]">
                          ERROR
                        </Badge>
                      )}
                    </div>
                    {comparison.status === "completed" ? (
                      <div className="mt-1.5 flex items-center gap-3 text-[10px]">
                        <span className="text-muted">
                          Δ{" "}
                          <span className="text-foreground">
                            {formatNumber(comparison.change_area_km2, 0)} km²
                          </span>
                        </span>
                        <span className="text-muted">
                          gain <span className="text-accent">{formatNumber(comparison.water_gain_km2, 0)}</span>
                        </span>
                        <span className="text-muted">
                          loss <span className="text-orange">{formatNumber(comparison.water_loss_km2, 0)}</span>
                        </span>
                        <ArrowUpRight className="ml-auto size-3 text-muted" />
                      </div>
                    ) : (
                      <p className="mt-1 text-[10px] text-danger">{comparison.error}</p>
                    )}
                  </div>
                ))}
              </div>
              <Link
                href={`/analysis?location=${timeline.location.slug}`}
                className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-soft"
              >
                Run a custom comparison <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          <Callout
            tone={timeline.is_synthetic ? "warning" : "info"}
            title={timeline.is_synthetic ? "Synthetic temporal record" : "Staged sample record"}
          >
            {timeline.is_synthetic
              ? "This timeline is built from generated demonstration scenes, not a historical satellite archive. Observation gaps and water-fraction values describe the demo generator, not a real environmental history."
              : "This timeline uses staged sample observations with their original attribution. It is not a validated environmental record and remains subject to the stated limitations."}
          </Callout>
        </div>
      ) : null}

      {!locationsQuery.isLoading && !locationsQuery.data?.length ? (
        <EmptyState
          icon={Info}
          title="No demonstration areas available"
          description="Start the TerraPulse API to seed the demo dataset."
          className="mt-6"
        />
      ) : null}
    </div>
  );
}