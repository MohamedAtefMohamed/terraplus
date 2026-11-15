"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Crosshair,
  Database,
  Layers3,
  Loader2,
  MapPin,
  PanelLeftClose,
  PanelRightClose,
  RotateCcw,
  Search,
  Satellite,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { AnalysisSummary, LiveItem, Observation } from "@/types/api";
import type { BasemapKey } from "@/components/map/map-canvas";
import { api, assetUrl, queryKeys } from "@/lib/api";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicMap } from "@/components/map/dynamic-map";
import { MapStatusHint } from "@/components/map/map-status";
import { SafeImage } from "@/components/ui/safe-image";

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  radar_observations: true,
  detected_changes: true,
  water_change: true,
  wetland_monitoring: true,
  nisar_live_footprints: true,
};

const BASEMAPS: Array<{ key: BasemapKey; label: string }> = [
  { key: "gibs", label: "GIBS" },
  { key: "satellite", label: "Esri" },
  { key: "dark", label: "Dark" },
  { key: "solid", label: "Solid" },
];

const PANELS = [
  { key: "details", label: "Details" },
  { key: "layers", label: "Layers" },
  { key: "nisar", label: "NISAR" },
] as const;

function distanceKm(a: [number, number], b: [number, number]) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLon = toRad(b[0] - a[0]);
  const dLat = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

function LiveResults({
  items,
  selectedId,
  onSelect,
}: {
  items: LiveItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const selected = selectedId === item.id;
        return (
          <button
            key={`${item.provider}-${item.id}`}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(item.id)}
            className={cn(
              "w-full rounded-md border p-2.5 text-left transition-colors",
              selected
                ? "border-accent/50 bg-accent/[0.08]"
                : "border-line bg-surface/60 hover:border-line-strong",
            )}
          >
            <div className="flex items-start gap-2.5">
              {item.browse_url ? (
                 
                <img
                  src={item.browse_url}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded border border-line object-cover"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded border border-line bg-background">
                  <Satellite className="size-3.5 text-accent/70" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="teal" className="text-[10px]">
                    {item.processing_level || item.product_type || "L1"}
                  </Badge>
                  {item.flight_direction ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      {item.flight_direction}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted-strong">
                  {item.acquired_at ? formatDate(item.acquired_at) : "date unknown"}
                </p>
                <p className="mt-0.5 truncate font-mono text-[9px] text-muted" title={item.id}>
                  {item.id}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TimelineStrip({
  observations,
  selectedId,
  onSelect,
}: {
  observations: Observation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const rows = useMemo(
    () => [...observations].sort((a, b) => a.acquired_at.localeCompare(b.acquired_at)),
    [observations],
  );

  const marks = useMemo(() => {
    if (rows.length < 2) return [];
    const times = rows.map((row) => new Date(row.acquired_at).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const span = Math.max(1, max - min);
    const months: Array<{ label: string; left: number }> = [];
    const cursor = new Date(min);
    cursor.setUTCDate(1);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor.getTime() <= max) {
      const left = ((cursor.getTime() - min) / span) * 100;
      if (left >= 0 && left <= 100) {
        months.push({
          label: cursor.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
          left,
        });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return months;
  }, [rows]);

  if (!rows.length) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-[11px] text-muted">
        <CalendarDays className="size-3.5" />
        No acquisition dates in the current window.
      </div>
    );
  }

  const times = rows.map((row) => new Date(row.acquired_at).getTime());
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(1, max - min);

  return (
    <div className="relative px-4 pb-4 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="tech-label">Acquisition timeline · {rows.length} records</p>
        <p className="font-mono text-[10px] text-muted">
          {formatDate(rows[0].acquired_at)} → {formatDate(rows[rows.length - 1].acquired_at)}
        </p>
      </div>
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-8 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
        {marks.map((month) => (
          <div key={`${month.label}-${month.left}`} className="absolute top-8" style={{ left: `${month.left}%` }}>
            <span className="block h-2 w-px bg-line-strong" />
            <span className="mt-1 block -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {month.label}
            </span>
          </div>
        ))}
        {rows.map((row) => {
          const left = ((new Date(row.acquired_at).getTime() - min) / span) * 100;
          const selected = row.id === selectedId;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              title={`${row.external_id}\n${formatDate(row.acquired_at)} · ${row.product_type}`}
              aria-label={`Select acquisition ${formatDate(row.acquired_at)}`}
              className="group absolute top-0 -translate-x-1/2"
              style={{ left: `${left}%` }}
            >
              <span
                className={cn(
                  "block rounded-t-sm border transition-all",
                  selected
                    ? "h-9 w-2 border-accent bg-accent/70"
                    : "h-6 w-1.5 border-line-strong bg-surface-high group-hover:h-8 group-hover:border-accent/60",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MapExplorer() {
  const searchParams = useSearchParams();
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY);
  const [panel, setPanel] = useState<(typeof PANELS)[number]["key"]>("details");
  const [basemap, setBasemap] = useState<BasemapKey>("gibs");
  const [selectedObservationId, setSelectedObservationId] = useState<number | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [clickedPoint, setClickedPoint] = useState<{ lng: number; lat: number } | null>(null);
  const [cursor, setCursor] = useState<{ lng: number; lat: number } | null>(null);
  const [areaQuery, setAreaQuery] = useState("");
  const [areaCategory, setAreaCategory] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [liveStart, setLiveStart] = useState("");
  const [liveEnd, setLiveEnd] = useState("");
  const [liveAreaSlug, setLiveAreaSlug] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations,
    queryFn: api.locations,
  });
  const layersQuery = useQuery({ queryKey: queryKeys.layers, queryFn: api.layers });
  const configQuery = useQuery({ queryKey: queryKeys.config, queryFn: api.config });
  const observationsQuery = useQuery({
    queryKey: queryKeys.observations({ location: selectedSlug || "pending" }),
    queryFn: () => api.observations({ location: selectedSlug, limit: 120 }),
    enabled: Boolean(selectedSlug),
  });

  useEffect(() => {
    if (selectedSlug || !locationsQuery.data?.length) return;
    const requested = searchParams.get("location");
    const match = locationsQuery.data.find((item) => item.slug === requested);
    setSelectedSlug(match?.slug || locationsQuery.data[0].slug);
  }, [locationsQuery.data, selectedSlug, searchParams]);

  const location = useMemo(
    () => (locationsQuery.data || []).find((item) => item.slug === selectedSlug),
    [locationsQuery.data, selectedSlug],
  );

  const analysesQuery = useQuery({
    queryKey: queryKeys.analyses({ location: selectedSlug }),
    queryFn: () => api.analyses({ location: selectedSlug || undefined, limit: 30 }),
    enabled: Boolean(selectedSlug),
  });

  useEffect(() => {
    setSelectedAnalysisId(null);
    setSelectedObservationId(null);
    setSelectedLiveId(null);
    setClickedPoint(null);
    setProductFilter("all");
  }, [selectedSlug]);

  const analyses = analysesQuery.data || [];
  const activeAnalysis: AnalysisSummary | null =
    analyses.find((analysis) => analysis.id === selectedAnalysisId) ||
    analyses[0] ||
    location?.latest_analysis ||
    null;

  const areaCategories = useMemo(
    () => [...new Set((locationsQuery.data || []).map((item) => item.category))].sort(),
    [locationsQuery.data],
  );

  const filteredAreas = useMemo(() => {
    const rows = locationsQuery.data || [];
    return rows.filter((item) => {
      if (areaCategory !== "all" && item.category !== areaCategory) return false;
      if (!areaQuery.trim()) return true;
      const query = areaQuery.trim().toLowerCase();
      return [item.name, item.region, item.country, item.category]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [locationsQuery.data, areaQuery, areaCategory]);

  const locationObservations = useMemo(() => {
    const rows = (observationsQuery.data || []).filter(
      (observation) => !observation.location_slug || observation.location_slug === selectedSlug,
    );
    return rows
      .filter((observation) => {
        const date = observation.acquired_at.slice(0, 10);
        if (dateStart && date < dateStart) return false;
        if (dateEnd && date > dateEnd) return false;
        if (productFilter !== "all" && observation.product_type !== productFilter) return false;
        return true;
      })
      .sort((a, b) => b.acquired_at.localeCompare(a.acquired_at));
  }, [observationsQuery.data, selectedSlug, dateStart, dateEnd, productFilter]);

  const productLevels = useMemo(() => {
    const rows = observationsQuery.data || [];
    return [...new Set(rows.map((row) => row.product_type))].sort();
  }, [observationsQuery.data]);

  const selectedObservation = useMemo(
    () =>
      (observationsQuery.data || []).find(
        (observation) => observation.id === selectedObservationId,
      ) || null,
    [observationsQuery.data, selectedObservationId],
  );

  const nearest = useMemo(() => {
    if (!clickedPoint || !locationsQuery.data?.length) return null;
    return locationsQuery.data
      .map((item) => ({
        location: item,
        distance: distanceKm([clickedPoint.lng, clickedPoint.lat], [item.center_lon, item.center_lat]),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }, [clickedPoint, locationsQuery.data]);

  const liveMutation = useMutation({
    mutationFn: () =>
      api.liveSearch({
        location: selectedSlug || undefined,
        start: liveStart || undefined,
        end: liveEnd || undefined,
        limit: 20,
      }),
    onSuccess: () => {
      setSelectedLiveId(null);
      setLiveAreaSlug(selectedSlug);
      setVisibility((current) => ({ ...current, nisar_live_footprints: true }));
      setPanel("nisar");
    },
  });

  useEffect(() => {
    if (liveAreaSlug && selectedSlug && liveAreaSlug !== selectedSlug) {
      liveMutation.reset();
      setLiveAreaSlug(null);
      setSelectedLiveId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, liveAreaSlug]);

  const liveItems = liveMutation.data?.items || [];
  const liveOnMap = liveAreaSlug === selectedSlug ? liveItems : [];
  const liveVisible = liveOnMap.length > 0 && (visibility.nisar_live_footprints ?? true);

  const handleSelectArea = (slug: string) => {
    setSelectedSlug(slug);
    setPanel("details");
  };

  const resetDates = () => {
    setDateStart("");
    setDateEnd("");
    setProductFilter("all");
  };

  const mapLoading = locationsQuery.isLoading;

  return (
    <div className="min-h-[calc(100vh-3.75rem)]">
      <div
        className={cn(
          "grid grid-cols-1 xl:h-[calc(100vh-3.75rem)]",
          leftOpen && rightOpen
            ? "xl:grid-cols-[286px_minmax(0,1fr)_330px]"
            : leftOpen
              ? "xl:grid-cols-[286px_minmax(0,1fr)_52px]"
              : rightOpen
                ? "xl:grid-cols-[52px_minmax(0,1fr)_330px]"
                : "xl:grid-cols-[52px_minmax(0,1fr)_52px]",
          "xl:grid-rows-[minmax(0,1fr)_132px]",
        )}
      >
        {/* ---------------------------------------------------------------- */}
        {/* LEFT — search, areas, acquisitions                                */}
        {/* ---------------------------------------------------------------- */}
        <aside
          className={cn(
            "order-2 border-line bg-surface/40 xl:order-1 xl:h-full xl:overflow-hidden",
            leftOpen ? "border-t xl:border-r xl:border-t-0" : "hidden xl:block",
          )}
        >
          {leftOpen ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <p className="eyebrow">Earth Explorer</p>
                  <h1 className="mt-0.5 text-sm font-semibold tracking-tight">Geospatial workspace</h1>
                </div>
                <button
                  type="button"
                  onClick={() => setLeftOpen(false)}
                  aria-label="Collapse left panel"
                  className="hidden size-7 items-center justify-center rounded border border-line text-muted hover:text-foreground xl:inline-flex"
                >
                  <PanelLeftClose className="size-3.5" />
                </button>
              </div>

              <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <label className="block space-y-1.5">
                  <span className="tech-label">Geographic search</span>
                  <span className="relative block">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                    <input
                      value={areaQuery}
                      onChange={(event) => setAreaQuery(event.target.value)}
                      placeholder="Area, region or country"
                      aria-label="Search monitoring areas"
                      className="w-full rounded-md border border-line bg-background/60 py-2 pl-8 pr-2.5 text-[11px] text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50"
                    />
                  </span>
                </label>

                {areaCategories.length ? (
                  <div>
                    <p className="tech-label">Hazard category</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {["all", ...areaCategories].map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setAreaCategory(name)}
                          className={cn(
                            "rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
                            areaCategory === name
                              ? "border-white/60 bg-white/[0.08] text-foreground"
                              : "border-white/10 text-muted hover:border-white/30 hover:text-foreground",
                          )}
                        >
                          {name === "all" ? "all" : name.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="tech-label">Monitoring areas ({filteredAreas.length})</p>
                  <div className="mt-2 space-y-1.5">
                    {mapLoading ? (
                      <>
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </>
                    ) : (
                      filteredAreas.map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => handleSelectArea(item.slug)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                            item.slug === selectedSlug
                              ? "border-accent/45 bg-accent/[0.08]"
                              : "border-line bg-background/40 hover:border-line-strong",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] font-medium text-foreground">
                              {item.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] text-muted">
                              {item.category} · {item.region}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-muted">
                            {item.bbox[0].toFixed(1)}°, {item.bbox[1].toFixed(1)}°
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-line bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="tech-label flex items-center gap-1.5">
                      <CalendarDays className="size-3" /> Date range
                    </p>
                    {(dateStart || dateEnd || productFilter !== "all") && (
                      <button
                        type="button"
                        onClick={resetDates}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:text-accent-soft"
                      >
                        <RotateCcw className="size-2.5" /> reset
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="text-[10px] text-muted">From</span>
                      <input
                        type="date"
                        aria-label="Observation filter start date"
                        value={dateStart}
                        max={dateEnd || undefined}
                        onChange={(event) => setDateStart(event.target.value)}
                        className="w-full rounded border border-line bg-surface px-2 py-1.5 font-mono text-[10px] text-foreground outline-none focus:border-accent/50"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] text-muted">To</span>
                      <input
                        type="date"
                        aria-label="Observation filter end date"
                        value={dateEnd}
                        min={dateStart || undefined}
                        onChange={(event) => setDateEnd(event.target.value)}
                        className="w-full rounded border border-line bg-surface px-2 py-1.5 font-mono text-[10px] text-foreground outline-none focus:border-accent/50"
                      />
                    </label>
                  </div>
                  {productLevels.length > 1 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {["all", ...productLevels].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setProductFilter(level)}
                          className={cn(
                            "rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
                            productFilter === level
                              ? "border-accent/50 bg-accent/[0.12] text-accent"
                              : "border-line text-muted hover:border-line-strong hover:text-foreground",
                          )}
                        >
                          {level === "all" ? "all products" : level}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="tech-label">Acquisitions ({locationObservations.length})</p>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                      NISAR
                    </span>
                  </div>
                  {observationsQuery.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : locationObservations.length ? (
                    <div className="space-y-1.5">
                      {locationObservations.map((observation) => (
                        <button
                          key={observation.id}
                          type="button"
                          onClick={() =>
                            setSelectedObservationId(
                              selectedObservationId === observation.id ? null : observation.id,
                            )
                          }
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md border p-2 text-left transition-colors",
                            selectedObservationId === observation.id
                              ? "border-accent/45 bg-accent/[0.08]"
                              : "border-line bg-background/40 hover:border-line-strong",
                          )}
                        >
                          <SafeImage
                            src={assetUrl(observation.preview_url)}
                            alt=""
                            className="size-8 rounded border border-line object-cover"
                            fallback={
                              <span className="grid size-8 place-items-center rounded border border-line">
                                <Satellite className="size-3 text-muted" />
                              </span>
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-[10px] text-foreground">
                              {formatDate(observation.acquired_at)}
                            </span>
                            <span className="mt-0.5 block truncate font-mono text-[9px] text-muted">
                              {observation.product_type} · {observation.polarization}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={CalendarDays}
                      title="No acquisitions in this window"
                      description="Widen the date range or clear the product filter."
                      action={
                        <Button size="sm" variant="outline" onClick={resetDates}>
                          <RotateCcw className="size-3" /> Reset filters
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLeftOpen(true)}
              aria-label="Expand left panel"
              className="hidden h-full w-full flex-col items-center gap-3 pt-4 text-muted hover:text-foreground xl:flex"
            >
              <PanelRightClose className="size-3.5 rotate-180" />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] [writing-mode:vertical-rl]">
                Panels
              </span>
            </button>
          )}
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* CENTER — map                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative order-1 h-[58vh] min-h-[420px] w-full bg-[#070708] xl:order-2 xl:h-full">
          {mapLoading ? (
            <Skeleton className="size-full rounded-none" />
          ) : locationsQuery.isError ? (
            <div className="flex h-full items-center justify-center p-6">
              <ErrorPanel
                message={(locationsQuery.error as Error).message}
                onRetry={() => locationsQuery.refetch()}
              />
            </div>
          ) : (
            <>
              <DynamicMap
                locations={locationsQuery.data || []}
                observations={observationsQuery.data || []}
                activeAnalysis={activeAnalysis}
                liveFootprints={liveOnMap}
                selectedLiveId={selectedLiveId}
                selectedLocationSlug={selectedSlug}
                basemap={basemap}
                layerVisibility={visibility}
                dateRange={{ start: dateStart || undefined, end: dateEnd || undefined }}
                clickedPoint={clickedPoint}
                className="size-full"
                onLocationSelect={handleSelectArea}
                onObservationSelect={(id) => {
                  setSelectedObservationId(id);
                  setPanel("details");
                }}
                onLiveFootprintSelect={(id) => {
                  setSelectedLiveId(id);
                  setPanel("nisar");
                }}
                onMapClick={(coords) => {
                  setClickedPoint(coords);
                  setPanel("details");
                }}
                onPointerMove={(coords) => setCursor(coords)}
              />

              <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
                <div className="pointer-events-auto flex flex-wrap gap-1.5">
                  {(locationsQuery.data || []).map((item) => (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => handleSelectArea(item.slug)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] backdrop-blur transition-colors",
                        item.slug === selectedSlug
                          ? "border-accent/50 bg-accent/15 text-accent"
                          : "border-line bg-[#111114]/85 text-muted-strong hover:border-line-strong hover:text-foreground",
                      )}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                <div className="pointer-events-auto flex items-center gap-1.5">
                  {!leftOpen ? (
                    <button
                      type="button"
                      onClick={() => setLeftOpen(true)}
                      className="hidden items-center gap-1.5 rounded-full border-white/10 bg-[#111114]/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-strong backdrop-blur hover:text-foreground xl:inline-flex"
                    >
                      <PanelLeftClose className="size-3" /> Panels
                    </button>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 rounded-full border-white/10 bg-[#111114]/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted backdrop-blur">
                    <Layers3 className="size-3 text-accent" />
                    {basemap === "gibs" ? "NASA GIBS" : basemap}
                  </span>
                  {liveVisible ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-[#111114]/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald backdrop-blur">
                      <Satellite className="size-3" />
                      {liveOnMap.length} catalogue
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded-md border-white/10 bg-[#111114]/90 p-3 backdrop-blur sm:block">
                <p className="tech-label">Legend</p>
                <div className="mt-2 space-y-1.5">
                  {visibility.water_change && activeAnalysis ? (
                    <>
                      <LegendRow color="#38bdf8" label="Water indicator gain" />
                      <LegendRow color="#d9a45b" label="Water indicator loss" />
                    </>
                  ) : null}
                  {visibility.detected_changes && activeAnalysis ? (
                    <LegendRow color="#5fd0c0" label="Backscatter change" />
                  ) : null}
                  {liveVisible ? <LegendRow color="#f4f4f4" label="NISAR footprint" /> : null}
                  {visibility.radar_observations ? (
                    <LegendRow color="#f4f4f4" label="NISAR acquisition" />
                  ) : null}
                  {visibility.wetland_monitoring ? (
                    <LegendRow color="#8bd1a9" label="Monitoring area" />
                  ) : null}
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-md border-white/10 bg-[#111114]/90 px-2.5 py-1.5 font-mono text-[10px] text-muted backdrop-blur">
                <Crosshair className="size-3 text-accent" />
                {cursor
                  ? `${cursor.lat.toFixed(4)}°, ${cursor.lng.toFixed(4)}°`
                  : "move cursor to read coordinates"}
              </div>

              <MapStatusHint
                note={liveVisible ? "NISAR footprints · live catalogue records" : undefined}
              />
            </>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* RIGHT — details, layers, NISAR                                    */}
        {/* ---------------------------------------------------------------- */}
        <aside
          className={cn(
            "order-3 border-line bg-surface/40 xl:h-full xl:overflow-hidden",
            rightOpen ? "border-t xl:border-l xl:border-t-0" : "hidden xl:block",
          )}
        >
          {rightOpen ? (
            <Tabs
              value={panel}
              onValueChange={(value) => setPanel(value as (typeof PANELS)[number]["key"])}
              className="flex h-full flex-col"
            >
              <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                <TabsList className="flex-1 justify-between">
                  {PANELS.map((item) => (
                    <TabsTrigger key={item.key} value={item.key} className="flex-1 justify-center">
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  aria-label="Collapse right panel"
                  className="hidden size-7 shrink-0 items-center justify-center rounded border border-line text-muted hover:text-foreground xl:inline-flex"
                >
                  <PanelRightClose className="size-3.5" />
                </button>
              </div>

              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
                <TabsContent value="details" className="mt-0 space-y-4 p-4">
                  {location ? (
                    <div className="panel p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">{location.name}</h2>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {location.region} · {location.country}
                          </p>
                        </div>
                        <Badge variant="teal">{location.focus.split("&")[0].trim()}</Badge>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted">
                        {location.description}
                      </p>
                      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line/70 pt-3">
                        <div>
                          <dt className="tech-label">Center</dt>
                          <dd className="mt-0.5 font-mono text-[10px] text-foreground">
                            {location.center_lat.toFixed(2)}°, {location.center_lon.toFixed(2)}°
                          </dd>
                        </div>
                        <div>
                          <dt className="tech-label">Records</dt>
                          <dd className="mt-0.5 font-mono text-[10px] text-foreground">
                            {location.observation_count}
                          </dd>
                        </div>
                        <div>
                          <dt className="tech-label">Latest Δ</dt>
                          <dd className="mt-0.5 font-mono text-[10px] text-foreground">
                            {activeAnalysis
                              ? `${formatNumber(activeAnalysis.change_area_km2, 0)} km²`
                              : "—"}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/live?area=${location.slug}`}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-accent/30 bg-accent/10 px-2 py-1.5 text-[10px] font-medium text-accent hover:bg-accent/15"
                        >
                          Compare scenes <ArrowRight className="size-3" />
                        </Link>
                        <Link
                          href={`/timeline?location=${location.slug}`}
                          className="inline-flex items-center justify-center gap-1 rounded border border-line px-2 py-1.5 text-[10px] text-muted-strong hover:border-line-strong hover:text-foreground"
                        >
                          Timeline
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {clickedPoint ? (
                    <div className="rounded-md border border-amber/25 bg-amber/[0.05] p-3">
                      <div className="flex items-center justify-between">
                        <p className="tech-label text-amber">Map point</p>
                        <button
                          type="button"
                          onClick={() => setClickedPoint(null)}
                          aria-label="Clear point"
                        >
                          <X className="size-3.5 text-muted" />
                        </button>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-foreground">
                        {clickedPoint.lat.toFixed(4)}°, {clickedPoint.lng.toFixed(4)}°
                      </p>
                      {nearest ? (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-[10px] text-muted">
                            Nearest area: {nearest.location.name} ·{" "}
                            {formatNumber(nearest.distance, 0)} km
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => handleSelectArea(nearest.location.slug)}
                          >
                            Select
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedObservation ? (
                    <div className="rounded-md border border-accent/25 bg-accent/[0.045] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="tech-label text-accent">Selected acquisition</p>
                          <p className="mt-1 text-[11px] font-medium text-foreground">
                            {formatDate(selectedObservation.acquired_at)}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted">
                            {selectedObservation.product_type} · {selectedObservation.crs}
                          </p>
                        </div>
                        <SafeImage
                          src={assetUrl(selectedObservation.preview_url)}
                          alt="Selected acquisition preview"
                          className="size-14 rounded border border-line object-cover"
                        />
                      </div>
                      <p className="mt-2 break-all font-mono text-[9px] text-muted">
                        {selectedObservation.external_id}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
                        <span>Orbit · {selectedObservation.acquisition_mode}</span>
                        <span>Resolution · {selectedObservation.resolution_m} m</span>
                        <span>Source · {selectedObservation.source_name}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          href={`/live?area=${selectedObservation.location_slug}`}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-soft"
                        >
                          Use in comparison <ArrowRight className="size-3" />
                        </Link>
                        {selectedObservation.source_url ? (
                          <a
                            href={selectedObservation.source_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-foreground"
                          >
                            ASF product page <ArrowUpRight className="size-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <Callout tone="info" title="Select an acquisition">
                      Click a timeline marker or a list entry to inspect granule metadata and jump
                      into a comparison.
                    </Callout>
                  )}

                  <div className="rounded-md border border-line bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="tech-label">Change overlay</p>
                      <span className="font-mono text-[10px] text-muted">
                        {analyses.length} cached
                      </span>
                    </div>
                    {analyses.length ? (
                      <>
                        <Select
                          value={String(activeAnalysis?.id || "")}
                          onValueChange={(value) => setSelectedAnalysisId(Number(value))}
                        >
                          <SelectTrigger className="mt-2 h-8 text-[10px]" aria-label="Change overlay">
                            <SelectValue placeholder="Select comparison" />
                          </SelectTrigger>
                          <SelectContent>
                            {analyses.map((analysis) => (
                              <SelectItem key={analysis.id} value={String(analysis.id)}>
                                {analysis.before_date} → {analysis.after_date}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {activeAnalysis ? (
                          <dl className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                            <div>
                              <dt className="text-muted">Δ area</dt>
                              <dd className="mt-0.5 font-medium text-foreground">
                                {formatNumber(activeAnalysis.change_area_km2, 0)} km²
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted">Water gain</dt>
                              <dd className="mt-0.5 font-medium text-accent">
                                {formatNumber(activeAnalysis.water_gain_km2, 0)} km²
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted">Confidence</dt>
                              <dd className="mt-0.5 font-medium text-emerald">
                                {activeAnalysis.confidence_label}
                              </dd>
                            </div>
                          </dl>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-2 text-[11px] leading-relaxed text-muted">
                        No comparison is cached for this area yet. Run one in the change lab to
                        render a measured overlay here.
                      </p>
                    )}
                  </div>

                  <Callout tone="warning" title="Interpretation guardrail">
                    Change layers show where radar backscatter crossed configurable thresholds.
                    They do not prove flooding, damage, or any specific cause.
                  </Callout>
                </TabsContent>

                <TabsContent value="layers" className="mt-0 space-y-4 p-4">
                  <div className="rounded-md border border-line bg-background/40 p-3">
                    <p className="tech-label flex items-center gap-1.5">
                      <SlidersHorizontal className="size-3" /> Layers
                    </p>
                    <div className="mt-3 space-y-3">
                      {(layersQuery.data?.layers || []).map((layer) => (
                        <div key={layer.key} className="flex items-start gap-3">
                          <span
                            className="mt-0.5 size-3 shrink-0 rounded-sm border"
                            style={{
                              backgroundColor: `${layer.color}22`,
                              borderColor: layer.color,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-foreground">{layer.name}</p>
                              <Switch
                                checked={visibility[layer.key] ?? true}
                                onCheckedChange={(checked) =>
                                  setVisibility((current) => ({ ...current, [layer.key]: checked }))
                                }
                                aria-label={`Toggle ${layer.name}`}
                              />
                            </div>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                              {layer.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-emerald/20 bg-emerald/[0.035] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-foreground">
                        NISAR catalogue footprints
                      </p>
                      <Switch
                        checked={visibility.nisar_live_footprints ?? true}
                        onCheckedChange={(checked) =>
                          setVisibility((current) => ({
                            ...current,
                            nisar_live_footprints: checked,
                          }))
                        }
                        aria-label="Toggle NISAR catalogue footprints"
                      />
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      Real granule footprint geometry from ASF. Not an analysis layer.
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-emerald">
                      {liveOnMap.length
                        ? `${liveOnMap.length} footprints on map`
                        : "run a NISAR search to populate"}
                    </p>
                  </div>

                  <div className="rounded-md border border-line bg-background/40 p-3">
                    <p className="tech-label">Basemap</p>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {BASEMAPS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setBasemap(item.key)}
                          className={cn(
                            "rounded border px-2 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                            basemap === item.key
                              ? "border-accent/40 bg-accent/10 text-accent"
                              : "border-line text-muted hover:border-line-strong hover:text-foreground",
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">
                      Imagery is contextual, not analysis data. Overlays render regardless of
                      basemap availability.
                    </p>
                  </div>

                  <div className="rounded-md border border-line bg-background/40 p-3">
                    <p className="tech-label">Overlay state</p>
                    <div className="mt-2 space-y-1.5 font-mono text-[10px] text-muted">
                      <div className="flex justify-between">
                        <span>Active area</span>
                        <span className="text-foreground">{location?.name || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active comparison</span>
                        <span className="text-foreground">
                          {activeAnalysis ? `#${activeAnalysis.id}` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date window</span>
                        <span className="text-foreground">
                          {dateStart || "any"} → {dateEnd || "any"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data mode</span>
                        <span className="text-emerald">live</span>
                      </div>
                    </div>
                  </div>

                  <Callout tone="info" title="About these layers">
                    {layersQuery.data?.disclaimer ||
                      "NISAR footprints are live catalogue metadata. Change overlays appear after a live Sentinel-1 comparison."}
                  </Callout>
                </TabsContent>

                <TabsContent value="nisar" className="mt-0 space-y-4 p-4">
                  <div className="rounded-md border border-emerald/25 bg-emerald/[0.045] p-3">
                    <div className="flex items-center justify-between">
                      <p className="tech-label flex items-center gap-1.5 text-emerald">
                        <Satellite className="size-3" /> NISAR catalogue query
                      </p>
                      <Badge variant={configQuery.data?.nisar.enabled ? "emerald" : "muted"}>
                        {configQuery.data?.nisar.enabled ? "ASF live" : "disabled"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">
                      Queries granule records through the ASF DAAC. Browse imagery is a quick-look;
                      product download needs Earthdata Login and is not performed here.
                    </p>
                    <div className="mt-2 space-y-1 font-mono text-[10px] text-muted">
                      <p>BBOX · {(location?.bbox || []).join(", ") || "select an area"}</p>
                      <p>PLATFORM · NISAR</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="tech-label">Start date</span>
                      <input
                        type="date"
                        aria-label="NISAR search start date"
                        value={liveStart}
                        onChange={(event) => setLiveStart(event.target.value)}
                        className="w-full rounded border border-line bg-surface px-2 py-1.5 font-mono text-[10px] text-foreground outline-none focus:border-accent/50"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="tech-label">End date</span>
                      <input
                        type="date"
                        aria-label="NISAR search end date"
                        value={liveEnd}
                        onChange={(event) => setLiveEnd(event.target.value)}
                        className="w-full rounded border border-line bg-surface px-2 py-1.5 font-mono text-[10px] text-foreground outline-none focus:border-accent/50"
                      />
                    </label>
                  </div>

                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => liveMutation.mutate()}
                    disabled={liveMutation.isPending || !selectedSlug}
                  >
                    {liveMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Search className="size-3.5" />
                    )}
                    Search NISAR catalogue
                  </Button>

                  {liveMutation.isError ? (
                    <Callout tone="danger" title="Catalogue query failed">
                      {(liveMutation.error as Error).message}
                    </Callout>
                  ) : null}

                  {liveMutation.data ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="tech-label">
                          Results · {liveMutation.data.items.length}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            liveMutation.reset();
                            setLiveAreaSlug(null);
                            setSelectedLiveId(null);
                          }}
                          className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-1 font-mono text-[10px] text-muted hover:text-foreground"
                        >
                          <X className="size-2.5" /> clear
                        </button>
                      </div>
                      {liveMutation.data.error ? (
                        <Callout tone="warning" title="Catalogue unavailable">
                          {liveMutation.data.error}
                        </Callout>
                      ) : null}
                      <LiveResults
                        items={liveMutation.data.items}
                        selectedId={selectedLiveId}
                        onSelect={(id) => {
                          setSelectedLiveId(id);
                          setVisibility((current) => ({
                            ...current,
                            nisar_live_footprints: true,
                          }));
                        }}
                      />
                      {!liveMutation.data.items.length && !liveMutation.data.error ? (
                        <EmptyState
                          icon={Satellite}
                          title="No matching granule records"
                          description="Widen the date range. Coverage and latency vary by track."
                        />
                      ) : null}
                    </div>
                  ) : (
                    <EmptyState
                      icon={MapPin}
                      title="Query the catalogue"
                      description="Uses the bounding box of the selected monitoring area and seeds the footprint layer."
                    />
                  )}

                  <div className="rounded-md border border-line bg-background/40 p-3">
                    <p className="tech-label flex items-center gap-1.5">
                      <Database className="size-3" /> Integration status
                    </p>
                    <div className="mt-2 space-y-1.5 font-mono text-[10px] text-muted">
                      <div className="flex justify-between">
                        <span>Earthdata credentials</span>
                        <span
                          className={
                            configQuery.data?.nisar.earthdata_credentials_configured
                              ? "text-emerald"
                              : "text-amber"
                          }
                        >
                          {configQuery.data?.nisar.earthdata_credentials_configured
                            ? "configured"
                            : "not required"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Browse imagery</span>
                        <span className="text-emerald">live</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pixel analysis</span>
                        <span className="text-emerald">Sentinel-1 C-band</span>
                      </div>
                      <div className="flex justify-between">
                        <span>NISAR L-band pixels</span>
                        <span className="text-muted">not public yet</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <button
              type="button"
              onClick={() => setRightOpen(true)}
              aria-label="Expand right panel"
              className="hidden h-full w-full flex-col items-center gap-3 pt-4 text-muted hover:text-foreground xl:flex"
            >
              <PanelLeftClose className="size-3.5 rotate-180" />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] [writing-mode:vertical-rl]">
                Inspector
              </span>
            </button>
          )}
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* BOTTOM — acquisition timeline                                     */}
        {/* ---------------------------------------------------------------- */}
        <div className="order-4 border-t border-line bg-background/60 xl:col-span-3">
          <TimelineStrip
            observations={locationObservations}
            selectedId={selectedObservationId}
            onSelect={(id) => {
              setSelectedObservationId(id);
              setPanel("details");
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default MapExplorer;