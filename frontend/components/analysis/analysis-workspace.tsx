"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  ChevronRight,
  GitCompareArrows,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import type { Analysis, Observation } from "@/types/api";
import { api, assetUrl, queryKeys } from "@/lib/api";
import { cn, formatDate, formatNumber, signed } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnalysisResult } from "@/components/analysis/analysis-result";

function ObservationPick({
  observation,
  role,
}: {
  observation: Observation | null;
  role: "earlier" | "later";
}) {
  if (!observation) {
    return (
      <div className="flex h-[74px] items-center justify-center rounded-md border border-dashed border-line text-[10px] text-muted">
        No observation selected
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-line bg-surface/60 p-2">
      <img
        src={assetUrl(observation.preview_url) || ""}
        alt=""
        className="size-11 rounded border border-line object-cover"
      />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted">{role}</p>
        <p className="truncate text-[11px] font-medium text-foreground">
          {formatDate(observation.acquired_at)}
        </p>
        <p className="font-mono text-[10px] text-muted">
          {observation.polarization} · {observation.resolution_m} m
        </p>
      </div>
    </div>
  );
}

export function AnalysisWorkspace() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialAnalysis = Number(searchParams.get("analysis"));
  const initialLocation = searchParams.get("location");

  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialLocation);
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [method, setMethod] = useState<"water_change" | "backscatter_diff">("water_change");
  const [threshold, setThreshold] = useState(3);
  const [waterThreshold, setWaterThreshold] = useState(-17);
  const [detailId, setDetailId] = useState<number | null>(
    Number.isFinite(initialAnalysis) && initialAnalysis > 0 ? initialAnalysis : null,
  );
  const [result, setResult] = useState<Analysis | null>(null);
  const initializedSlug = useRef<string | null>(null);
  const defaultsApplied = useRef(false);

  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: api.locations });
  const configQuery = useQuery({ queryKey: queryKeys.config, queryFn: api.config });

  useEffect(() => {
    if (!selectedSlug && locationsQuery.data?.length) {
      setSelectedSlug(initialLocation || locationsQuery.data[0].slug);
    }
  }, [initialLocation, locationsQuery.data, selectedSlug]);

  useEffect(() => {
    if (configQuery.data && !defaultsApplied.current) {
      setThreshold(configQuery.data.defaults.change_threshold_db);
      setWaterThreshold(configQuery.data.defaults.water_threshold_db);
      defaultsApplied.current = true;
    }
  }, [configQuery.data]);

  const observationsQuery = useQuery({
    queryKey: queryKeys.observations({ location: selectedSlug }),
    queryFn: () => api.observations({ location: selectedSlug || undefined }),
    enabled: Boolean(selectedSlug),
  });

  const observations = useMemo(
    () =>
      [...(observationsQuery.data || [])].sort((a, b) =>
        a.acquired_at.localeCompare(b.acquired_at),
      ),
    [observationsQuery.data],
  );

  useEffect(() => {
    if (!selectedSlug || !observations.length) return;
    if (initializedSlug.current === selectedSlug) return;
    initializedSlug.current = selectedSlug;
    const requestedBefore = Number(searchParams.get("before"));
    const requestedAfter = Number(searchParams.get("after"));
    const candidateBefore = observations.find((item) => item.id === requestedBefore)?.id;
    const candidateAfter = observations.find((item) => item.id === requestedAfter)?.id;
    const before = candidateBefore ?? observations[0].id;
    let after = candidateAfter ?? observations[observations.length - 1].id;
    if (after === before && observations.length > 1) {
      after = observations[observations.length - 1].id === before ? observations[0].id : observations[observations.length - 1].id;
    }
    setBeforeId(before);
    setAfterId(after);
  }, [selectedSlug, observations, searchParams]);

  const analysesQuery = useQuery({
    queryKey: queryKeys.analyses({ location: selectedSlug }),
    queryFn: () => api.analyses({ location: selectedSlug || undefined, limit: 12 }),
    enabled: Boolean(selectedSlug),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.analysis(detailId || 0),
    queryFn: () => api.analysis(detailId as number),
    enabled: Boolean(detailId),
  });

  useEffect(() => {
    if (!detailId || !detailQuery.data || detailQuery.data.id !== detailId) return;
    setResult(detailQuery.data);
    if (selectedSlug !== detailQuery.data.location_slug) {
      setSelectedSlug(detailQuery.data.location_slug);
    }
  }, [detailId, detailQuery.data, selectedSlug]);

  const beforeObservation = observations.find((item) => item.id === beforeId) || null;
  const afterObservation = observations.find((item) => item.id === afterId) || null;
  const orderValid = Boolean(
    beforeObservation &&
      afterObservation &&
      beforeObservation.id !== afterObservation.id &&
      beforeObservation.acquired_at < afterObservation.acquired_at,
  );

  const mutation = useMutation({
    mutationFn: () =>
      api.compare({
        before_observation_id: beforeId as number,
        after_observation_id: afterId as number,
        method,
        change_threshold_db: threshold,
        water_threshold_db: waterThreshold,
      }),
    onSuccess: (analysis) => {
      setResult(analysis);
      setDetailId(null);
      toast.success(`Analysis #${analysis.id} completed`, {
        description: `${analysis.location_name}: ${formatNumber(analysis.change_area_km2, 1)} km² exceeded the threshold.`,
      });
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
    onError: (error: Error) => {
      toast.error("Comparison failed", { description: error.message });
    },
  });

  const location = locationsQuery.data?.find((item) => item.slug === selectedSlug) || null;

  const selectLocation = (slug: string) => {
    setSelectedSlug(slug);
    setResult(null);
    setDetailId(null);
    initializedSlug.current = null;
  };

  const openSaved = (analysisId: number) => {
    setDetailId(analysisId);
    setResult(null);
  };

  const swap = () => {
    setBeforeId(afterId);
    setAfterId(beforeId);
  };

  return (
    <div className="container-page py-8 lg:py-10">
      <PageHeader
        eyebrow="Change analysis"
        title="Compare two observations"
        description="Run a real raster comparison on the demonstration dataset. Every result carries its statistics, processing quality and limitations."
        actions={
          <>
            <Badge variant={configQuery.data?.data.is_synthetic === false ? "emerald" : "amber"}>
              {configQuery.data?.data.label || "DEMO DATA · SYNTHETIC"}
            </Badge>
            <Link
              href="/methodology"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Method <Info className="size-3.5" />
            </Link>
          </>
        }
      />

      {locationsQuery.isError ? (
        <ErrorPanel
          message={(locationsQuery.error as Error).message}
          onRetry={() => locationsQuery.refetch()}
          className="mt-4"
        />
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompareArrows className="size-3.5 text-accent" />
                <h2 className="text-xs font-semibold text-foreground">Comparison setup</h2>
              </div>
              <Badge variant="outline">2 scenes</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Monitoring area
                </label>
                <Select value={selectedSlug || ""} onValueChange={selectLocation}>
                  <SelectTrigger aria-label="Monitoring area">
                    <SelectValue placeholder={locationsQuery.isLoading ? "Loading areas..." : "Select area"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(locationsQuery.data || []).map((item) => (
                      <SelectItem key={item.slug} value={item.slug}>
                        {item.name} · {item.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {observationsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : observations.length ? (
                <>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      Earlier observation
                    </label>
                    <Select
                      value={String(beforeId || "")}
                      onValueChange={(value) => setBeforeId(Number(value))}
                    >
                      <SelectTrigger aria-label="Earlier observation">
                        <SelectValue placeholder="Select earlier scene" />
                      </SelectTrigger>
                      <SelectContent>
                        {observations.map((observation) => (
                          <SelectItem key={observation.id} value={String(observation.id)}>
                            {formatDate(observation.acquired_at)} · {observation.mission}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={swap}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-line-strong hover:text-foreground"
                    >
                      <ArrowUpDown className="size-2.5" /> swap dates
                    </button>
                  </div>

                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      Later observation
                    </label>
                    <Select
                      value={String(afterId || "")}
                      onValueChange={(value) => setAfterId(Number(value))}
                    >
                      <SelectTrigger aria-label="Later observation">
                        <SelectValue placeholder="Select later scene" />
                      </SelectTrigger>
                      <SelectContent>
                        {observations.map((observation) => (
                          <SelectItem key={observation.id} value={String(observation.id)}>
                            {formatDate(observation.acquired_at)} · {observation.mission}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <ObservationPick observation={beforeObservation} role="earlier" />
                    <ObservationPick observation={afterObservation} role="later" />
                  </div>

                  {!orderValid ? (
                    <Callout tone="warning" title="Check the date order">
                      The earlier observation must precede the later one, and the two must differ.
                      Use swap dates to correct the selection.
                    </Callout>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No observations for this area"
                  description="Choose another demonstration area."
                />
              )}

              <div className="rounded-md border border-line bg-surface/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    <SlidersHorizontal className="size-3" /> Processing parameters
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setThreshold(configQuery.data?.defaults.change_threshold_db ?? 3);
                      setWaterThreshold(configQuery.data?.defaults.water_threshold_db ?? -17);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-accent"
                  >
                    <RefreshCw className="size-2.5" /> defaults
                  </button>
                </div>
                <div className="mt-3 space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted">Change threshold</span>
                      <span className="font-mono text-[10px] text-accent">± {threshold.toFixed(1)} dB</span>
                    </div>
                    <Slider
                      className="mt-2"
                      thumbLabel="Change threshold in decibels"
                      value={[threshold]}
                      min={1}
                      max={8}
                      step={0.5}
                      onValueChange={(values) => setThreshold(values[0])}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted">Water indicator threshold</span>
                      <span className="font-mono text-[10px] text-accent">
                        &lt; {waterThreshold.toFixed(1)} dB
                      </span>
                    </div>
                    <Slider
                      className="mt-2"
                      thumbLabel="Water indicator threshold in decibels"
                      value={[waterThreshold]}
                      min={-26}
                      max={-10}
                      step={0.5}
                      onValueChange={(values) => setWaterThreshold(values[0])}
                    />
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted">
                  Thresholds are configurable screening parameters, not universal scientific
                  constants. Defaults come from the server configuration.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Method
                </label>
                <Select value={method} onValueChange={(value) => setMethod(value as typeof method)}>
                  <SelectTrigger aria-label="Comparison method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="water_change">Water change · dB + indicator</SelectItem>
                    <SelectItem value="backscatter_diff">Backscatter difference · dB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={() => mutation.mutate()}
                disabled={!orderValid || mutation.isPending || observationsQuery.isLoading}
              >
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GitCompareArrows className="size-4" />
                )}
                {mutation.isPending ? "Running comparison..." : "Run change comparison"}
              </Button>
              <p className="text-center font-mono text-[11px] leading-relaxed text-muted">
                POST /api/analysis/compare · persisted with provenance
              </p>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground">Saved analyses</h2>
              <Badge variant="outline">{analysesQuery.data?.length ?? 0}</Badge>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Persisted comparisons for this area. Click one to reload its full result.
            </p>
            <div className="mt-3 space-y-1.5">
              {analysesQuery.isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : analysesQuery.data?.length ? (
                analysesQuery.data.map((analysis) => (
                  <button
                    key={analysis.id}
                    type="button"
                    onClick={() => openSaved(analysis.id)}
                    className={cn(
                      "w-full rounded-md border p-2.5 text-left transition-colors",
                      result?.id === analysis.id
                        ? "border-accent/40 bg-accent/[0.06]"
                        : "border-line bg-surface/50 hover:border-line-strong",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[10px] text-muted">
                        {analysis.before_date} → {analysis.after_date}
                      </p>
                      <ChevronRight className="size-3 text-muted" />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-foreground">
                        Δ {formatNumber(analysis.change_area_km2, 0)} km² · water{" "}
                        {signed(analysis.net_water_change_km2, 0)}
                      </span>
                      <span className="text-emerald">{analysis.confidence_label}</span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="rounded border border-dashed border-line px-3 py-4 text-center text-[10px] text-muted">
                  No analyses yet for this area. Run one above.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          {detailQuery.isLoading ? (
            <div className="panel space-y-4 p-5">
              <Skeleton className="h-6 w-64" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="aspect-video w-full" />
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          ) : result ? (
            <AnalysisResult analysis={result} location={location} />
          ) : mutation.isPending ? (
            <div className="panel flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
                <Loader2 className="size-5 animate-spin text-accent" />
              </div>
              <p className="text-sm font-medium text-foreground">Comparing scenes</p>
              <p className="max-w-xs text-[11px] leading-relaxed text-muted">
                Loading both rasters, validating alignment, computing the dB difference and
                deriving overlays and statistics.
              </p>
            </div>
          ) : (
            <div className="panel flex min-h-[420px] flex-col items-center justify-center p-8">
              <EmptyState
                icon={GitCompareArrows}
                title="No comparison selected"
                description="Choose an earlier and a later observation, set your thresholds, then run the comparison. Or reload a saved analysis from the list."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => mutation.mutate()}
                      disabled={!orderValid}
                    >
                      Run current pair <ArrowDown className="size-3" />
                    </Button>
                    <Link
                      href="/map"
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      Explore observations <ArrowRight className="size-3" />
                    </Link>
                  </div>
                }
              />
              <div className="mt-6 grid w-full max-w-lg grid-cols-2 gap-2">
                <ObservationPick observation={beforeObservation} role="earlier" />
                <ObservationPick observation={afterObservation} role="later" />
              </div>
              <p className="mt-4 max-w-md text-center text-[11px] leading-relaxed text-muted">
                The comparison engine computes a speckle-suppressed dB difference, a low-backscatter
                water indicator, area statistics, quality indicators and GeoJSON outlines. It does
                not declare floods or attribute causes.
              </p>
            </div>
          )}

          {mutation.isError ? (
            <div className="mt-3">
              <ErrorPanel
                title="The comparison could not be completed"
                message={(mutation.error as Error).message}
                onRetry={() => mutation.mutate()}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: "Deterministic interpretation",
            body: "Open the AI insights panel to read an explanation that separates measured facts from cautious interpretation.",
            href: result ? `/insights?analysis=${result.id}` : "/insights",
            cta: "Open insights",
          },
          {
            icon: CalendarDays,
            title: "Temporal context",
            body: "See how the low-backscatter water indicator evolves across the full observation record for this area.",
            href: `/timeline?location=${selectedSlug || ""}`,
            cta: "View timeline",
          },
          {
            icon: Info,
            title: "Method and limits",
            body: "Read exactly what the dB thresholds measure, what the confidence score means and what the method cannot conclude.",
            href: "/methodology",
            cta: "Methodology",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="panel panel-hover group flex items-start gap-3 p-4"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded border border-accent/20 bg-accent/[0.06]">
                <Icon className="size-3.5 text-accent" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{item.body}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-accent">
                  {item.cta} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}