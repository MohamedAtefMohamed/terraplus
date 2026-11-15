"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, CircleDot, Play, Satellite } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { TourButton } from "@/components/tour/tour-button";
import {
  SENSOR_MODES,
  TacticalGlobe,
  type GlobeMarker,
  type SensorMode,
} from "@/components/visual/tactical-globe";

export function OrbitalHero() {
  const [sensor, setSensor] = useState<SensorMode>("eo");
  const catalogue = useQuery({
    queryKey: queryKeys.liveNisar({ viewer: "hero" }),
    queryFn: () => api.liveNisar({ days: 30, limit: 100 }),
    staleTime: 120_000,
  });
  const locations = useQuery({ queryKey: queryKeys.locations, queryFn: api.locations });

  const markers: GlobeMarker[] = useMemo(() => {
    const items = catalogue.data?.items || [];
    return items
      .flatMap((item, index) => {
        const lon = item.center_lon ?? item.footprint?.[0]?.[0];
        const lat = item.center_lat ?? item.footprint?.[0]?.[1];
        if (lon === undefined || lon === undefined || lat === undefined || lat === null) return [];
        const marker: GlobeMarker = {
          lon: Number(lon),
          lat: Number(lat),
          tone: index < 6 ? "amber" : "cyan",
          label: item.id,
        };
        return [marker];
      })
      .slice(0, 60);
  }, [catalogue.data]);

  const latest = catalogue.data?.items?.[0];

  const indicators = [
    {
      label: "Catalogue records · 30 d",
      value: catalogue.isLoading ? "—" : String(catalogue.data?.count ?? 0),
      note: "ASF DAAC, worldwide",
    },
    {
      label: "Latest acquisition",
      value: latest ? formatDate(latest.start) : catalogue.isLoading ? "—" : "none",
      note: latest ? `${latest.flight_direction ?? "orbit"} · ${latest.product_level ?? "L1"}` : "awaiting catalogue",
    },
    {
      label: "Monitoring areas",
      value: locations.isLoading ? "—" : String(locations.data?.length ?? 0),
      note: "delta and basin sites",
    },
    {
      label: "Pixel analysis",
      value: "Sentinel-1",
      note: "C-band GRD, on demand",
    },
  ];

  return (
    <section className="relative isolate overflow-hidden border-b border-white/[0.06]">
      <div className="pointer-events-none absolute inset-0 grid-surface opacity-[0.18]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="container-page relative grid grid-cols-1 items-center gap-8 pb-14 pt-12 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:pb-20 lg:pt-16">
        <div className="max-w-2xl space-y-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.08] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-accent-soft">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-soft-pulse rounded-full bg-accent" />
                <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
              </span>
              Orbital intelligence
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              <Satellite className="size-3 text-accent" />
              {catalogue.data?.source?.split("·")[0]?.trim() || "ASF DAAC catalogue"}
            </span>
          </div>

          <h1 className="display-xl text-[2.75rem] text-foreground sm:text-[3.6rem] lg:text-[4.1rem]">
            Observe Earth.
            <br />
            <span className="text-gradient">Understand Change.</span>
          </h1>

          <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted-strong sm:text-base">
            Transform satellite observations into actionable geospatial intelligence. Monitor
            surface dynamics, compare radar acquisitions, and uncover environmental changes through
            advanced Earth-observation technologies.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/map" className={cn(buttonVariants({ size: "lg" }))}>
              Launch Earth Explorer
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/methodology"
              className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
            >
              Explore our technology
            </Link>
            <TourButton label="Guided tour" variant="ghost" size="lg" className="text-muted-strong" />
            <a
              href="#briefing"
              className="inline-flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-foreground"
            >
              <Play className="size-3" />
              Watch the 20 s briefing
            </a>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line/60 sm:grid-cols-4">
            {indicators.map((item) => (
              <div key={item.label} className="bg-surface/70 px-3.5 py-3">
                <dt className="tech-label leading-tight">{item.label}</dt>
                <dd className="metric-value mt-1.5 text-lg font-semibold text-foreground">
                  {item.value}
                </dd>
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted" title={item.note}>
                  {item.note}
                </p>
              </div>
            ))}
          </dl>

          {latest ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <span className="inline-flex items-center gap-1.5 text-accent">
                <CircleDot className="size-3" /> live
              </span>
              <span>{latest.id.slice(0, 44)}</span>
              <span className="text-muted/70">{formatDateTime(latest.start)} UTC</span>
              {latest.center_lat !== null && latest.center_lon !== null ? (
                <span className="text-muted/70">
                  {Number(latest.center_lat).toFixed(2)}°, {Number(latest.center_lon).toFixed(2)}°
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="relative">
          <div className="panel bracket tactical-frame relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-soft-pulse rounded-full bg-emerald" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald" />
                </span>
                <p className="tech-label text-foreground">World view</p>
              </div>
              <div className="flex items-center gap-1">
                {SENSOR_MODES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    title={item.hint}
                    aria-pressed={sensor === item.key}
                    onClick={() => setSensor(item.key)}
                    className={cn(
                      "rounded-[3px] border px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors",
                      sensor === item.key
                        ? "border-white/70 bg-white/[0.1] text-foreground"
                        : "border-white/10 text-muted hover:border-white/30 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <TacticalGlobe
                markers={markers}
                mode={sensor}
                className="h-[340px] w-full sm:h-[440px] lg:h-[520px]"
              />
              <div className="film-grain" aria-hidden="true" />
              {sensor === "crt" || sensor === "nvg" ? (
                <div className="crt-lines" aria-hidden="true" />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] px-4 py-2.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                Orthographic · graticule 30° · orbit tracks illustrative
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                {markers.length} live acquisitions
              </p>
            </div>
          </div>
          <Link
            href="/live"
            className="panel panel-hover absolute -bottom-5 right-4 hidden items-center gap-2 px-3.5 py-2.5 sm:flex"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground">
              Change analysis
            </span>
            <ArrowUpRight className="size-3.5 text-muted" />
          </Link>
          <p className="mt-3 hidden text-right font-mono text-[9px] uppercase tracking-[0.14em] text-subtle sm:block">
            World view adapted from RisingCyber/Worldview_Tactical_Intelligence
          </p>
        </div>
      </div>
    </section>
  );
}