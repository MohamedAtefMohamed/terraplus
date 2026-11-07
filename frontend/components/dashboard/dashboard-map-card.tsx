"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Droplets, GitCompareArrows, Map as MapIcon } from "lucide-react";
import type { Location } from "@/types/api";
import { DynamicMap } from "@/components/map/dynamic-map";
import { MapStatusHint } from "@/components/map/map-status";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber } from "@/lib/utils";

export function DashboardMapCard({ locations }: { locations: Location[] }) {
  const [selectedSlug, setSelectedSlug] = useState(locations[0]?.slug ?? null);
  const [mode, setMode] = useState<"water" | "change">("water");
  const selected = locations.find((location) => location.slug === selectedSlug) || locations[0];

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <MapIcon className="size-3.5 text-accent" />
          <span className="text-xs font-medium text-foreground">Surface intelligence map</span>
          <Badge variant={selected?.is_demo === false ? "emerald" : "amber"}>
            {selected?.is_demo === false ? "SAMPLE" : "DEMO"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode("water")}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
              mode === "water"
                ? "bg-accent/12 text-accent"
                : "text-muted hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            <Droplets className="size-3" /> Water
          </button>
          <button
            type="button"
            onClick={() => setMode("change")}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
              mode === "change"
                ? "bg-teal/12 text-teal"
                : "text-muted hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            <GitCompareArrows className="size-3" /> Change
          </button>
          <Link
            href={`/map?location=${selected?.slug || ""}`}
            className="ml-1 inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-1 text-[10px] text-muted-strong transition-colors hover:border-line-strong hover:text-foreground"
          >
            Full explorer <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>

      <div className="relative h-[360px]">
        <DynamicMap
          locations={locations}
          selectedLocationSlug={selected?.slug}
          activeAnalysis={selected?.latest_analysis || null}
          basemap="satellite"
          layerVisibility={{
            radar_observations: true,
            detected_changes: mode === "change",
            water_change: mode === "water",
            wetland_monitoring: true,
          }}
          className="size-full"
          preview
        />
        <MapStatusHint
          note={
            selected?.is_demo === false
              ? "Staged sample footprint · attributed"
              : undefined
          }
        />
        <div className="absolute left-3 top-3 max-w-[260px] rounded-md border border-line bg-[#07101c]/92 p-3 backdrop-blur">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Selected monitoring area
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{selected?.name ?? "—"}</p>
          <p className="mt-0.5 text-[10px] text-muted">
            {selected?.region} · {selected?.country}
          </p>
          {selected?.latest_analysis ? (
            <div className="mt-2 flex items-center gap-3 border-t border-line/70 pt-2 text-[10px]">
              <span className="text-muted">
                Δ{" "}
                <span className="text-foreground">
                  {formatNumber(selected.latest_analysis.change_area_km2, 0)} km²
                </span>
              </span>
              <span className="text-muted">
                quality{" "}
                <span className="text-emerald">{selected.latest_analysis.confidence_label}</span>
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-2.5">
        {locations.map((location) => (
          <button
            key={location.slug}
            type="button"
            onClick={() => setSelectedSlug(location.slug)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] transition-colors",
              location.slug === selected?.slug
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-line text-muted hover:border-line-strong hover:text-foreground",
            )}
          >
            {location.name}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-muted">
          <span className="size-1.5 rounded-full bg-accent" /> {mode === "water" ? "water indicator" : "Δ backscatter"}
        </span>
      </div>
    </div>
  );
}