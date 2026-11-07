"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Database,
  ExternalLink,
  Layers3,
  Loader2,
  MapPin,
  RotateCcw,
  Satellite,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { AnalysisSummary, LiveItem } from "@/types/api";
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

const DEFAULT_VISIBILITY: Record<string, boolean> = {
  radar_observations: true,
  detected_changes: true,
  water_change: true,
  wetland_monitoring: true,
  nisar_live_footprints: true,
};

const BASEMAPS: Array<{ key: BasemapKey; label: string }> = [
  { key: "satellite", label: "Satellite" },
  { key: "dark", label: "Dark vector" },
  { key: "solid", label: "Solid fallback" },
];

function distanceKm(a: [number, number], b: [number, number]) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const lon1 = toRad(a[0]);
  const lat1 = toRad(a[1]);
  const lon2 = toRad(b[0]);
  const lat2 = toRad(b[1]);
  const dLon = lon2 - lon1;
  const dLat = lat2 - lat1;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
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
          <article
            key={`${item.provider}-${item.id}`}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(item.id);
              }
            }}
            className={cn(
              "cursor-pointer rounded-md border bg-surface/70 p-3 transition-colors",
              selected
                ? "border-emerald/60 bg-emerald/[0.07] ring-1 ring-emerald/25"
                : "border-line hover:border-line-strong",
            )}
          >
            <div className="flex items-start gap-3">
              {item.browse_url ? (
                <img
                  src={item.browse_url}
                  alt=""
                  className="h-16 w-20 shrink-0 rounded border border-line object-cover"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded border border-line bg-background">
                  <Satellite className="size-4 text-emerald/70" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="emerald">{item.mission}</Badge>
                  {item.product_type ? (
                    <Badge variant="outline">{String(item.product_type)}</Badge>
                  ) : null}
                  {item.provider === "ASF" ? <Badge variant="muted">ASF</Badge> : null}
                  {selected ? (
                    <Badge variant="amber" className="text-[10px]">
                      ON MAP
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1.5 break-all font-mono text-[11px] leading-relaxed text-muted-strong">
                  {item.id}
                </p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line/60 pt-2 text-[10px]">
              <div>
                <p className="text-muted">Acquired</p>
                <p className="mt-0.5 text-foreground">
                  {item.acquired_at
                    ? formatDate(item.acquired_at, {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted">Polarization</p>
                <p className="mt-0.5 text-foreground">
                  {Array.isArray(item.polarization)
                    ? item.polarization.join(", ")
                    : item.polarization || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted">Path / frame</p>
                <p className="mt-0.5 text-foreground">
                  {item.path ?? "—"} / {item.frame ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted">Direction</p>
                <p className="mt-0.5 text-foreground">{item.flight_direction || "—"}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="rounded border border-amber/20 bg-amber/[0.05] px-2 py-1.5 text-[11px] leading-relaxed text-amber/90">
                Metadata only · no download or processing
              </p>
              {item.download_url ? (
                <a
                  href={item.download_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex shrink-0 items-center gap-1 text-[10px] text-accent hover:text-accent-soft"
                >
                  Product <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function MapExplorer() {
  const searchParams = useSearchParams();
  const initialLocation = searchParams.get("location");
  const initialPanel = searchParams.get("panel") === "nisar" ? "nisar" : "explore";

  const [panel, setPanel] = useState(initialPanel);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialLocation);
  const [basemap, setBasemap] = useState<BasemapKey>("satellite");
  const [visibility, setVisibility] = useState<Record<string, boolean>>(DEFAULT_VISIBILITY);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedObservationId, setSelectedObservationId] = useState<number | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null);
  const [liveAreaSlug, setLiveAreaSlug] = useState<string | null>(null);
  const [clickedPoint, setClickedPoint] = useState<{ lng: number; lat: number } | null>(null);
  const [liveStart, setLiveStart] = useState("");
  const [liveEnd, setLiveEnd] = useState("");

  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: api.locations });
  const layersQuery = useQuery({ queryKey: queryKeys.layers, queryFn: api.layers });
  const configQuery = useQuery({ queryKey: queryKeys.config, queryFn: api.config });
  const observationsQuery = useQuery({
    queryKey: queryKeys.observations({ all: true }),
    queryFn: () => api.observations({ limit: 300 }),
  });

  useEffect(() => {
    if (!selectedSlug && locationsQuery.data?.length) {
      setSelectedSlug(locationsQuery.data[0].slug);
    }
  }, [selectedSlug, locationsQuery.data]);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 45);
    setLiveEnd(end.toISOString().slice(0, 10));
    setLiveStart(start.toISOString().slice(0, 10));
  }, []);

  const location = useMemo(
    () => locationsQuery.data?.find((item) => item.slug === selectedSlug) || null,
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
  }, [selectedSlug]);

  const analyses = analysesQuery.data || [];
  const activeAnalysis: AnalysisSummary | null =
    analyses.find((analysis) => analysis.id === selectedAnalysisId) ||
    analyses[0] ||
    location?.latest_analysis ||
    null;

  const locationObservations = useMemo(() => {
    const rows = (observationsQuery.data || []).filter(
      (observation) => observation.location_slug === selectedSlug,
    );
    return rows
      .filter((observation) => {
        const date = observation.acquired_at.slice(0, 10);
        if (dateStart && date < dateStart) return false;
        if (dateEnd && date > dateEnd) return false;
        return true;
      })
      .sort((a, b) => b.acquired_at.localeCompare(a.acquired_at));
  }, [observationsQuery.data, selectedSlug, dateStart, dateEnd]);

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
  const liveVisible =
    liveOnMap.length > 0 && (visibility.nisar_live_footprints ?? true);

  const handleMapClick = (coords: { lng: number; lat: number }) => {
    setClickedPoint(coords);
    setPanel("explore");
  };

  const handleObservationSelect = (id: number) => {
    const observation = (observationsQuery.data || []).find((item) => item.id === id);
    if (observation?.location_slug) setSelectedSlug(observation.location_slug);
    setSelectedObservationId(id);
    setPanel("explore");
  };

  const resetDates = () => {
    setDateStart("");
    setDateEnd("");
  };

  const mapLoading = locationsQuery.isLoading;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:h-[calc(100vh-4rem)] lg:flex-row">
      <section className="relative order-1 h-[56vh] min-h-[420px] w-full shrink-0 border-b border-line bg-[#04080f] lg:order-1 lg:h-full lg:w-auto lg:min-w-0 lg:flex-1 lg:shrink lg:border-b-0">
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
              onLocationSelect={(slug) => setSelectedSlug(slug)}
              onObservationSelect={handleObservationSelect}
              onLiveFootprintSelect={(id) => {
                setSelectedLiveId(id);
                setPanel("nisar");
              }}
              onMapClick={handleMapClick}
            />

            <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap gap-1.5">
              {(locationsQuery.data || []).map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setSelectedSlug(item.slug)}
                  className={cn(
                    "pointer-events-auto rounded-full border px-3 py-1.5 text-[10px] font-medium backdrop-blur transition-colors",
                    item.slug === selectedSlug
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-line bg-[#07101c]/85 text-muted-strong hover:border-line-strong hover:text-foreground",
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="pointer-events-none absolute bottom-10 left-3 z-10 hidden rounded-md border border-line bg-[#07101c]/90 p-3 backdrop-blur sm:block">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Legend</p>
              <div className="mt-2 space-y-1.5">
                {visibility.water_change && activeAnalysis ? (
                  <>
                    <LegendRow color="#38bdf8" label="New water indicator" />
                    <LegendRow color="#fb923c" label="Lost water indicator" />
                  </>
                ) : null}
                {visibility.detected_changes && activeAnalysis ? (
                  <>
                    <LegendRow color="#2dd4bf" label="Backscatter increase" />
                    <LegendRow color="#fb923c" label="Backscatter decrease" />
                  </>
                ) : null}
                {liveVisible ? (
                  <LegendRow color="#34d399" label="NISAR metadata footprint" />
                ) : null}
                {visibility.radar_observations ? (
                  <LegendRow
                    color="#22d3ee"
                    label={location?.is_demo === false ? "Sample observations" : "Demo observations"}
                  />
                ) : null}
                {visibility.wetland_monitoring ? (
                  <LegendRow color="#34d399" label="Monitoring areas" />
                ) : null}
              </div>
            </div>

            {liveVisible ? (
              <div className="pointer-events-none absolute right-12 top-3 z-10 flex items-center gap-1.5 rounded-full border border-emerald/30 bg-[#07101c]/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald backdrop-blur">
                <Satellite className="size-2.5" />
                NISAR metadata · {liveOnMap.length} footprints
              </div>
            ) : null}
            <MapStatusHint
              note={
                liveVisible
                  ? "NISAR footprints = real granule metadata · not processed"
                  : location?.is_demo === false
                    ? "Staged sample footprint · attributed"
                    : undefined
              }
            />
            <div className="pointer-events-none absolute bottom-2 right-3 z-10 rounded border border-line bg-[#07101c]/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              {basemap === "satellite" ? "Esri imagery" : basemap === "dark" ? "CARTO dark" : "Solid fallback"}
            </div>
          </>
        )}
      </section>

      <aside className="order-2 flex w-full shrink-0 flex-col border-line bg-surface/30 lg:h-full lg:w-[410px] lg:border-l">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="eyebrow">Map explorer</p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight">Observation lens</h1>
            </div>
            <Badge
              variant={
                locationsQuery.data?.some((item) => !item.is_demo) ? "emerald" : "amber"
              }
            >
              {locationsQuery.data?.some((item) => !item.is_demo)
                ? "MIXED · DEMO + SAMPLE"
                : "DEMO · SYNTHETIC"}
            </Badge>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            Pan, zoom, select an area, filter dates and toggle derived layers. Footprints are
            example monitoring areas, not real satellite coverage.
          </p>
        </div>

        <Tabs value={panel} onValueChange={setPanel} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-line px-4 py-2.5">
            <TabsList className="w-full justify-between">
              <TabsTrigger value="explore" className="flex-1 justify-center">
                <MapPin className="size-3" /> Explore
              </TabsTrigger>
              <TabsTrigger value="layers" className="flex-1 justify-center">
                <Layers3 className="size-3" /> Layers
              </TabsTrigger>
              <TabsTrigger value="nisar" className="flex-1 justify-center">
                <Satellite className="size-3" /> NISAR live
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <TabsContent value="explore" className="mt-0 space-y-4 p-4">
              {location ? (
                <div className="rounded-md border border-line bg-surface/80 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{location.name}</h2>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {location.region} · {location.country}
                      </p>
                    </div>
                    <Badge variant="teal">{location.focus.split("&")[0].trim()}</Badge>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">{location.description}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line/70 pt-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        Center
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-foreground">
                        {location.center_lat.toFixed(2)}°, {location.center_lon.toFixed(2)}°
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        Scenes
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-foreground">
                        {location.observation_count}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        Latest Δ
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-foreground">
                        {activeAnalysis ? `${formatNumber(activeAnalysis.change_area_km2, 0)} km²` : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/analysis?location=${location.slug}`}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-accent/30 bg-accent/10 px-2 py-1.5 text-[10px] font-medium text-accent hover:bg-accent/15"
                    >
                      Compare scenes <ArrowRight className="size-3" />
                    </Link>
                    <Link
                      href={`/timeline?location=${location.slug}`}
                      className="inline-flex items-center justify-center gap-1 rounded border border-line px-2 py-1.5 text-[10px] text-muted-strong hover:border-line-strong hover:text-foreground"
                    >
                      Timeline <ChevronRight className="size-3" />
                    </Link>
                  </div>
                </div>
              ) : null}

              {clickedPoint ? (
                <div className="rounded-md border border-amber/25 bg-amber/[0.05] p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
                      Map point
                    </p>
                    <button type="button" onClick={() => setClickedPoint(null)} aria-label="Clear point">
                      <X className="size-3.5 text-muted" />
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-foreground">
                    {clickedPoint.lat.toFixed(4)}°, {clickedPoint.lng.toFixed(4)}°
                  </p>
                  {nearest ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-muted">
                        Nearest demo area: {nearest.location.name} · {formatNumber(nearest.distance, 0)} km
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => setSelectedSlug(nearest.location.slug)}
                      >
                        Select
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-md border border-line bg-surface/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    <CalendarDays className="size-3" /> Observation date filter
                  </p>
                  {(dateStart || dateEnd) && (
                    <button
                      type="button"
                      onClick={resetDates}
                      className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent-soft"
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
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    Observations ({locationObservations.length})
                  </p>
                  <span className="font-mono text-[10px] text-muted">VV · demo</span>
                </div>
                {observationsQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
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
                          "flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors",
                          selectedObservationId === observation.id
                            ? "border-accent/40 bg-accent/[0.07]"
                            : "border-line bg-surface/50 hover:border-line-strong",
                        )}
                      >
                        <img
                          src={assetUrl(observation.preview_url) || ""}
                          alt=""
                          className="size-9 rounded border border-line object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-foreground">
                            {formatDate(observation.acquired_at)}
                          </p>
                          <p className="font-mono text-[10px] text-muted">
                            {observation.external_id.split("-").slice(-1)[0]} · {observation.polarization} · 4-look
                          </p>
                        </div>
                        <Badge variant="amber" className="text-[10px]">
                          DEMO
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CalendarDays}
                    title="No observations in this range"
                    description="Adjust the date filter or reset it to show the full demonstration record."
                    action={
                      <Button size="sm" variant="outline" onClick={resetDates}>
                        <RotateCcw className="size-3" /> Reset dates
                      </Button>
                    }
                  />
                )}
              </div>

              {selectedObservation ? (
                <div className="rounded-md border border-accent/25 bg-accent/[0.045] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                        Selected observation
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-foreground">
                        {formatDate(selectedObservation.acquired_at)}
                      </p>
                      <p className="font-mono text-[10px] text-muted">
                        {selectedObservation.product_type} · {selectedObservation.crs}
                      </p>
                    </div>
                    <img
                      src={assetUrl(selectedObservation.preview_url) || ""}
                      alt="Selected demo backscatter scene"
                      className="size-16 rounded border border-line object-cover"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
                    <span>Mission · {selectedObservation.mission}</span>
                    <span>Resolution · {selectedObservation.resolution_m} m</span>
                    <span>Source · {selectedObservation.source_name}</span>
                  </div>
                  <Link
                    href={`/analysis?location=${selectedObservation.location_slug}&before=${selectedObservation.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-soft"
                  >
                    Use in comparison <ArrowRight className="size-3" />
                  </Link>
                </div>
              ) : null}

              {analyses.length ? (
                <div className="rounded-md border border-line bg-surface/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      Analysis overlay
                    </p>
                    <span className="font-mono text-[10px] text-muted">{analyses.length} saved</span>
                  </div>
                  <Select
                    value={String(activeAnalysis?.id || "")}
                    onValueChange={(value) => setSelectedAnalysisId(Number(value))}
                  >
                    <SelectTrigger
                      className="mt-2 h-8 text-[10px]"
                      aria-label="Analysis overlay"
                    >
                      <SelectValue placeholder="Select analysis" />
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
                    <>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                          <p className="text-muted">Δ area</p>
                          <p className="mt-0.5 font-medium text-foreground">
                            {formatNumber(activeAnalysis.change_area_km2, 0)} km²
                          </p>
                        </div>
                        <div>
                          <p className="text-muted">Water gain</p>
                          <p className="mt-0.5 font-medium text-accent">
                            {formatNumber(activeAnalysis.water_gain_km2, 0)} km²
                          </p>
                        </div>
                        <div>
                          <p className="text-muted">Quality</p>
                          <p className="mt-0.5 font-medium text-emerald">
                            {activeAnalysis.confidence_label}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/analysis?analysis=${activeAnalysis.id}`}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-soft"
                      >
                        Open full analysis <ArrowUpRight className="size-3" />
                      </Link>
                    </>
                  ) : null}
                </div>
              ) : null}

              <Callout tone="warning" title="Interpretation guardrail">
                Change layers show where radar backscatter crossed configurable thresholds. They do
                not prove flooding, damage or any specific cause.
              </Callout>
            </TabsContent>

            <TabsContent value="layers" className="mt-0 space-y-4 p-4">
              <div className="rounded-md border border-line bg-surface/60 p-3">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  <SlidersHorizontal className="size-3" /> Concept layers
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
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {layer.legend.map((entry) => (
                            <span
                              key={entry.label}
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-muted"
                            >
                              <span
                                className="size-1.5 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-emerald/20 bg-emerald/[0.035] p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-1 size-3 shrink-0 rounded-sm border border-emerald bg-emerald/20" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-foreground">
                        NISAR metadata footprints
                      </p>
                      <Switch
                        checked={visibility.nisar_live_footprints ?? true}
                        onCheckedChange={(checked) =>
                          setVisibility((current) => ({
                            ...current,
                            nisar_live_footprints: checked,
                          }))
                        }
                        aria-label="Toggle NISAR metadata footprints"
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      Real granule footprint metadata returned by ASF. These are not analysis
                      layers and have not been downloaded or processed.
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-emerald">
                      {liveOnMap.length
                        ? `${liveOnMap.length} live footprints on map`
                        : "Run a live NISAR search to populate this layer"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-line bg-surface/60 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Basemap
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {BASEMAPS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setBasemap(item.key)}
                      className={cn(
                        "rounded border px-2 py-2 text-[10px] transition-colors",
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
                  Satellite imagery is a contextual basemap and is not analysis data. Use the solid
                  fallback if remote tiles are unavailable; overlays still render.
                </p>
              </div>

              <div className="rounded-md border border-line bg-surface/60 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  Overlay state
                </p>
                <div className="mt-2 space-y-1.5 font-mono text-[10px] text-muted">
                  <div className="flex justify-between">
                    <span>Active area</span>
                    <span className="text-foreground">{location?.name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active analysis</span>
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
                    <span className="text-amber">demo</span>
                  </div>
                </div>
              </div>

              <Callout tone="info" title="Why these layers are conceptual">
                {layersQuery.data?.disclaimer ||
                  "Footprints and overlays are demonstrations, not real NISAR coverage."}
              </Callout>
            </TabsContent>

            <TabsContent value="nisar" className="mt-0 space-y-4 p-4">
              <div className="rounded-md border border-emerald/25 bg-emerald/[0.045] p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald">
                    <Satellite className="size-3" /> NISAR metadata discovery
                  </p>
                  <Badge variant={configQuery.data?.nisar.enabled ? "emerald" : "muted"}>
                    {configQuery.data?.nisar.enabled ? "ASF live" : "disabled"}
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  Queries real granule metadata through the ASF DAAC. No product is downloaded or
                  processed by this MVP. Authenticated Earthdata access is required for that.
                </p>
                <div className="mt-2 space-y-1 font-mono text-[10.5px] text-muted">
                  <p>BBOX · {(location?.bbox || []).join(", ") || "select an area"}</p>
                  <p>PLATFORM · NISAR</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] text-muted">Start date</span>
                  <input
                    type="date"
                    aria-label="NISAR search start date"
                    value={liveStart}
                    onChange={(event) => setLiveStart(event.target.value)}
                    className="w-full rounded border border-line bg-surface px-2 py-1.5 font-mono text-[10px] text-foreground outline-none focus:border-accent/50"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-muted">End date</span>
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
                Search NISAR granules
              </Button>

              {!location ? (
                <EmptyState
                  icon={MapPin}
                  title="Select a monitoring area"
                  description="Live discovery uses the bounding box of the selected demonstration area."
                />
              ) : null}

              {liveMutation.isError ? (
                <Callout tone="danger" title="Live discovery failed">
                  {(liveMutation.error as Error).message}
                </Callout>
              ) : null}

              {liveMutation.data ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      Results · {liveMutation.data.items.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted">
                        {liveMutation.data.provider} · metadata only
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          liveMutation.reset();
                          setLiveAreaSlug(null);
                          setSelectedLiveId(null);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-1 font-mono text-[10px] text-muted hover:border-line-strong hover:text-foreground"
                      >
                        <X className="size-2.5" /> clear
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-emerald/20 bg-emerald/[0.04] px-3 py-2">
                    <div>
                      <p className="text-[10px] font-medium text-foreground">
                        Show on map
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        Explore real metadata footprints. Click a polygon or a result card.
                      </p>
                    </div>
                    <Switch
                      checked={visibility.nisar_live_footprints ?? true}
                      onCheckedChange={(checked) =>
                        setVisibility((current) => ({
                          ...current,
                          nisar_live_footprints: checked,
                        }))
                      }
                      aria-label="Show NISAR footprints on map"
                    />
                  </div>
                  {liveMutation.data.error ? (
                    <Callout tone="warning" title="Discovery unavailable">
                      {liveMutation.data.error}
                    </Callout>
                  ) : null}
                  {liveMutation.data.warning ? (
                    <Callout tone="info">{liveMutation.data.warning}</Callout>
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
                      title="No matching granule metadata"
                      description="Try a wider date range. Absence of results does not mean the mission has no data; coverage and latency vary."
                    />
                  ) : null}
                  <p className="text-[11px] leading-relaxed text-muted">{liveMutation.data.disclaimer}</p>
                </div>
              ) : null}

              <div className="rounded-md border border-line bg-surface/60 p-3">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  <Database className="size-3" /> Integration status
                </p>
                <div className="mt-2 space-y-1.5 text-[10px] text-muted">
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
                        : "not configured"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Product download</span>
                    <span className="text-muted">not enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Analysis mode</span>
                    <span className="text-amber">demo fallback</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </aside>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}