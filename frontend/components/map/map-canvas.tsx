"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { AnalysisSummary, LiveItem, Location, Observation } from "@/types/api";
import { assetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export type BasemapKey = "satellite" | "dark" | "solid";

type OverlayAnalysis = AnalysisSummary & {
  bounds?: [number, number, number, number];
};

interface MapCanvasProps {
  locations: Location[];
  observations?: Observation[];
  activeAnalysis?: OverlayAnalysis | null;
  liveFootprints?: LiveItem[];
  selectedLiveId?: string | null;
  selectedLocationSlug?: string | null;
  basemap?: BasemapKey;
  layerVisibility?: Record<string, boolean>;
  dateRange?: { start?: string; end?: string };
  clickedPoint?: { lng: number; lat: number } | null;
  className?: string;
  preview?: boolean;
  onLocationSelect?: (slug: string) => void;
  onObservationSelect?: (id: number) => void;
  onLiveFootprintSelect?: (id: string) => void;
  onMapClick?: (coords: { lng: number; lat: number }) => void;
}

interface MinimalFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown>;
  }>;
}

if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
}

const ESRI_ATTRIBUTION =
  "Esri, Maxar, Earthstar Geographics, and the GIS User Community";
const CARTO_ATTRIBUTION = "© OpenStreetMap contributors © CARTO";

function bboxPolygon(bbox: [number, number, number, number]) {
  const [west, south, east, north] = bbox;
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
}

function buildLocations(locations: Location[]): MinimalFeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations.map((location) => ({
      ...bboxPolygon(location.bbox),
      properties: {
        slug: location.slug,
        name: location.name,
        focus: location.focus,
        country: location.country,
      },
    })),
  };
}

function buildObservations(
  observations: Observation[],
  dateRange?: { start?: string; end?: string },
): MinimalFeatureCollection {
  const filtered = observations.filter((observation) => {
    const date = observation.acquired_at.slice(0, 10);
    if (dateRange?.start && date < dateRange.start) return false;
    if (dateRange?.end && date > dateRange.end) return false;
    return true;
  });

  const grouped = new Map<string, Observation[]>();
  for (const observation of filtered) {
    const key = observation.location_slug || "unknown";
    const group = grouped.get(key) || [];
    group.push(observation);
    grouped.set(key, group);
  }

  const features: MinimalFeatureCollection["features"] = [];
  for (const [slug, group] of grouped) {
    const sorted = [...group].sort((a, b) => a.acquired_at.localeCompare(b.acquired_at));
    sorted.forEach((observation, index) => {
      const center = observation.bbox
        ? [
            (observation.bbox[0] + observation.bbox[2]) / 2,
            (observation.bbox[1] + observation.bbox[3]) / 2,
          ]
        : [0, 0];
      const offset = (index - (sorted.length - 1) / 2) * 0.019;
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [center[0] + offset, center[1] + Math.abs(offset) * 0.32],
        },
        properties: {
          id: observation.id,
          slug,
          date: observation.acquired_at.slice(0, 10),
          mission: observation.mission,
        },
      });
    });
  }

  return { type: "FeatureCollection", features };
}

function buildLiveFootprints(items: LiveItem[]): MinimalFeatureCollection {
  return {
    type: "FeatureCollection",
    features: items
      .filter((item) => {
        const geometry = item.geometry as { type?: string; coordinates?: unknown } | null;
        return Boolean(geometry?.type && geometry?.coordinates);
      })
      .map((item) => ({
        type: "Feature",
        geometry: item.geometry as unknown as MinimalFeatureCollection["features"][number]["geometry"],
        properties: {
          id: item.id,
          product: item.product_type || item.processing_level || "NISAR",
          date: item.acquired_at || "",
          mission: item.mission,
        },
      })),
  };
}

function clickedPointFC(point: { lng: number; lat: number } | null): MinimalFeatureCollection {
  return {
    type: "FeatureCollection",
    features: point
      ? [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [point.lng, point.lat] },
            properties: {},
          },
        ]
      : [],
  };
}

const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-imagery": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: ESRI_ATTRIBUTION,
    },
    "carto-dark": {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 18,
      attribution: CARTO_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#04080f" },
    },
    {
      id: "esri-base",
      type: "raster",
      source: "esri-imagery",
      paint: {
        "raster-opacity": 0.82,
        "raster-saturation": -0.32,
        "raster-contrast": 0.04,
        "raster-brightness-min": 0.04,
        "raster-brightness-max": 0.92,
      },
    },
    {
      id: "carto-base",
      type: "raster",
      source: "carto-dark",
      layout: { visibility: "none" },
      paint: { "raster-opacity": 0.72 },
    },
  ],
};

export function MapCanvas({
  locations,
  observations = [],
  activeAnalysis = null,
  liveFootprints = [],
  selectedLiveId = null,
  selectedLocationSlug = null,
  basemap = "satellite",
  layerVisibility = {},
  dateRange,
  clickedPoint = null,
  className,
  preview = false,
  onLocationSelect,
  onObservationSelect,
  onLiveFootprintSelect,
  onMapClick,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const callbacks = useRef({
    onLocationSelect,
    onObservationSelect,
    onLiveFootprintSelect,
    onMapClick,
  });
  useEffect(() => {
    callbacks.current = {
      onLocationSelect,
      onObservationSelect,
      onLiveFootprintSelect,
      onMapClick,
    };
  }, [onLocationSelect, onObservationSelect, onLiveFootprintSelect, onMapClick]);

  const visible = (key: string, fallback = true) =>
    layerVisibility[key] === undefined ? fallback : layerVisibility[key];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASE_STYLE,
        center: [90, 20],
        zoom: preview ? 1.35 : 2.2,
        minZoom: 1.1,
        maxZoom: 17,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 90 }), "bottom-left");
    if (!preview) {
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: false },
          trackUserLocation: false,
        }),
        "top-right",
      );
    }

    map.on("load", () => {
      map.addSource("locations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "areas-fill",
        type: "fill",
        source: "locations",
        paint: {
          "fill-color": "#34d399",
          "fill-opacity": selectedLocationSlug ? 0.05 : 0.07,
        },
      });
      map.addLayer({
        id: "areas-line",
        type: "line",
        source: "locations",
        paint: {
          "line-color": "#34d399",
          "line-width": 1.3,
          "line-opacity": 0.55,
          "line-dasharray": [3, 2],
        },
      });

      map.addSource("nisar-footprints", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "nisar-fill",
        type: "fill",
        source: "nisar-footprints",
        paint: {
          "fill-color": "#34d399",
          "fill-opacity": 0.055,
        },
      });
      map.addLayer({
        id: "nisar-line",
        type: "line",
        source: "nisar-footprints",
        paint: {
          "line-color": "#34d399",
          "line-width": 1.4,
          "line-opacity": 0.8,
        },
      });

      map.addSource("observations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "obs-halo",
        type: "circle",
        source: "observations",
        paint: {
          "circle-radius": 9,
          "circle-color": "#22d3ee",
          "circle-opacity": 0.13,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#22d3ee",
          "circle-stroke-opacity": 0.35,
        },
      });
      map.addLayer({
        id: "obs-circles",
        type: "circle",
        source: "observations",
        paint: {
          "circle-radius": 4.2,
          "circle-color": "#22d3ee",
          "circle-opacity": 0.95,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#04131a",
        },
      });

      map.addSource("clicked-point", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "clicked-point-ring",
        type: "circle",
        source: "clicked-point",
        paint: {
          "circle-radius": 8,
          "circle-color": "#fbbf24",
          "circle-opacity": 0.15,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fbbf24",
          "circle-stroke-opacity": 0.7,
        },
      });
      map.addLayer({
        id: "clicked-point-dot",
        type: "circle",
        source: "clicked-point",
        paint: {
          "circle-radius": 2.4,
          "circle-color": "#fbbf24",
        },
      });

      map.on("click", (event: maplibregl.MapMouseEvent) => {
        const pointLayers = ["nisar-fill", "obs-circles", "areas-fill"];
        const features = map.queryRenderedFeatures(event.point, { layers: pointLayers });
        if (features.length) {
          const feature = features[0];
          const slug = String(feature.properties?.slug || "");
          const observationId = Number(feature.properties?.id);
          if (feature.layer.id === "nisar-fill") {
            callbacks.current.onLiveFootprintSelect?.(String(feature.properties?.id || ""));
            return;
          }
          if (feature.layer.id === "obs-circles" && observationId) {
            callbacks.current.onObservationSelect?.(observationId);
            if (slug) callbacks.current.onLocationSelect?.(slug);
            return;
          }
          if (slug) {
            callbacks.current.onLocationSelect?.(slug);
            return;
          }
        }
        callbacks.current.onMapClick?.({ lng: event.lngLat.lng, lat: event.lngLat.lat });
      });

      map.on("mouseenter", "obs-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "obs-circles", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "areas-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "areas-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "nisar-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "nisar-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("error", () => {
        /* tile failures degrade gracefully to the background */
      });

      setReady(true);
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("locations") as maplibregl.GeoJSONSource | undefined;
    source?.setData(buildLocations(locations) as never);
  }, [ready, locations]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("observations") as maplibregl.GeoJSONSource | undefined;
    source?.setData(buildObservations(observations, dateRange) as never);
  }, [ready, observations, dateRange]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("nisar-footprints") as maplibregl.GeoJSONSource | undefined;
    source?.setData(buildLiveFootprints(liveFootprints) as never);
  }, [ready, liveFootprints]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("clicked-point") as maplibregl.GeoJSONSource | undefined;
    source?.setData(clickedPointFC(clickedPoint) as never);
  }, [ready, clickedPoint]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const set = (layer: string, value: boolean) => {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, "visibility", value ? "visible" : "none");
      }
    };
    set("areas-fill", visible("wetland_monitoring"));
    set("areas-line", visible("wetland_monitoring"));
    set("nisar-fill", visible("nisar_live_footprints"));
    set("nisar-line", visible("nisar_live_footprints"));
    set("obs-halo", visible("radar_observations"));
    set("obs-circles", visible("radar_observations"));
    if (map.getLayer("water-raster")) set("water-raster", visible("water_change"));
    if (map.getLayer("change-raster")) set("change-raster", visible("detected_changes"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, layerVisibility]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const set = (layer: string, value: "visible" | "none") => {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, "visibility", value);
      }
    };
    set("esri-base", basemap === "satellite" ? "visible" : "none");
    set("carto-base", basemap === "dark" ? "visible" : "none");
    if (map.getLayer("areas-fill")) {
      map.setPaintProperty(
        "areas-fill",
        "fill-opacity",
        selectedLocationSlug ? 0.04 : 0.07,
      );
    }
  }, [ready, basemap, selectedLocationSlug]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const bounds = new maplibregl.LngLatBounds();
    locations.forEach((location) => {
      bounds.extend([location.bbox[0], location.bbox[1]]);
      bounds.extend([location.bbox[2], location.bbox[3]]);
    });
    if (locations.length && !bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: preview ? 28 : 70,
        maxZoom: preview ? 5 : 7,
        duration: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, locations.length]);

  useEffect(() => {
    if (!ready || !selectedLocationSlug) return;
    const map = mapRef.current;
    const location = locations.find((item) => item.slug === selectedLocationSlug);
    if (!map || !location) return;
    map.fitBounds(
      [
        [location.bbox[0], location.bbox[1]],
        [location.bbox[2], location.bbox[3]],
      ],
      { padding: preview ? 40 : 110, maxZoom: 9, duration: 850 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedLocationSlug]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const selected = selectedLiveId || "__tp_none__";
    if (map.getLayer("nisar-line")) {
      map.setPaintProperty("nisar-line", "line-width", [
        "case",
        ["==", ["get", "id"], selected],
        3,
        1.4,
      ]);
      map.setPaintProperty("nisar-line", "line-color", [
        "case",
        ["==", ["get", "id"], selected],
        "#fbbf24",
        "#34d399",
      ]);
    }
    if (map.getLayer("nisar-fill")) {
      map.setPaintProperty("nisar-fill", "fill-opacity", [
        "case",
        ["==", ["get", "id"], selected],
        0.16,
        0.055,
      ]);
    }
  }, [ready, selectedLiveId]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("change-raster")) map.removeLayer("change-raster");
    if (map.getSource("change-overlay")) map.removeSource("change-overlay");
    if (map.getLayer("water-raster")) map.removeLayer("water-raster");
    if (map.getSource("water-overlay")) map.removeSource("water-overlay");

    if (!activeAnalysis) return;
    const [west, south, east, north] = activeAnalysis.bounds || [];
    if (![west, south, east, north].every((value) => typeof value === "number")) return;
    const coordinates = [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ];
    const beforeId = map.getLayer("areas-line") ? "areas-line" : undefined;

    const changeUrl = assetUrl(activeAnalysis.change_overlay_url);
    if (changeUrl) {
      try {
        map.addSource("change-overlay", {
          type: "image",
          url: changeUrl,
          coordinates: coordinates as never,
        });
        map.addLayer(
          {
            id: "change-raster",
            type: "raster",
            source: "change-overlay",
            paint: { "raster-opacity": 0.82, "raster-fade-duration": 200 },
            layout: {
              visibility: visible("detected_changes") ? "visible" : "none",
            },
          },
          beforeId,
        );
      } catch {
        /* ignore overlay failure */
      }
    }

    const waterUrl = assetUrl(activeAnalysis.water_overlay_url);
    if (waterUrl) {
      try {
        map.addSource("water-overlay", {
          type: "image",
          url: waterUrl,
          coordinates: coordinates as never,
        });
        map.addLayer(
          {
            id: "water-raster",
            type: "raster",
            source: "water-overlay",
            paint: { "raster-opacity": 0.88, "raster-fade-duration": 200 },
            layout: {
              visibility: visible("water_change") ? "visible" : "none",
            },
          },
          beforeId,
        );
      } catch {
        /* ignore overlay failure */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeAnalysis]);

  return (
    <div
      className={cn("relative size-full min-h-[280px]", className)}
      data-live-footprints={liveFootprints.length}
    >
      <div ref={containerRef} className="absolute inset-0" aria-label="Interactive SAR monitoring map" />
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/90 p-6 text-center">
          <p className="max-w-sm text-xs leading-relaxed text-muted">
            This browser could not initialise WebGL, so the interactive map is unavailable. All
            analysis data, charts and statistics remain accessible in the side panels.
          </p>
        </div>
      ) : null}
      {!ready && !failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050a12]">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            Initialising map surface
          </div>
        </div>
      ) : null}
    </div>
  );
}
