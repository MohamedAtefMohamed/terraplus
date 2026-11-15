"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Globe2, Radio, Satellite, Waves } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

function TickRow({ seed = 1 }: { seed?: number }) {
  const ticks = Array.from({ length: 26 }).map((_, index) => {
    const h = 4 + ((index * seed * 7) % 13);
    return h;
  });
  return (
    <div className="tick-row h-4">
      {ticks.map((height, index) => (
        <span key={index} style={{ height: `${height}px` }} />
      ))}
    </div>
  );
}

export function IntelligenceOverview() {
  const dashboard = useQuery({ queryKey: queryKeys.dashboard, queryFn: api.dashboard });
  const sources = useQuery({ queryKey: queryKeys.dataSources, queryFn: api.dataSources });
  const stats = dashboard.data?.stats;

  const metrics = [
    {
      label: "Catalogue acquisitions · 30 d",
      value: stats ? formatNumber(stats.observations, 0) : "—",
      note: "NISAR granule records from ASF",
      source: "ASF DAAC",
      icon: Satellite,
    },
    {
      label: "Monitored areas",
      value: stats ? String(stats.locations) : "—",
      note: stats
        ? `${formatNumber(stats.area_in_latest_analyses_km2, 0)} km² of bounding boxes`
        : "delta and basin sites",
      source: "TerraPulse",
      icon: Waves,
    },
    {
      label: "Pixel comparisons",
      value: stats ? String(stats.analyses) : "—",
      note: stats?.analyses ? "cached on this instance" : "run one in the change lab",
      source: "Sentinel-1",
      icon: Radio,
    },
    {
      label: "Data services",
      value: sources.data ? String(sources.data.sources.length) : "—",
      note: "catalogue, STAC, scene storage, imagery",
      source: "live",
      icon: Globe2,
    },
  ];

  return (
    <section className="section-band">
      <div className="container-page py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-xl space-y-2">
                <p className="eyebrow">Intelligence overview</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.85rem]">
                  Live platform state
                </h2>
                <p className="text-sm leading-relaxed text-muted">
                  Every value is read from a live service. Catalogue counts come from the ASF
                  search API; comparisons appear once a Sentinel-1 pair has been measured.
                </p>
              </div>
              <Link href="/dashboard" className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft">
                Open console <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {metrics.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="tech-label">{item.label}</p>
                      <Icon className="size-3.5 text-accent" />
                    </div>
                    <p className="metric-value mt-3 text-3xl font-semibold text-foreground">
                      {item.value}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">{item.note}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted/80">
                        {item.source}
                      </span>
                      <TickRow seed={item.label.length} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <Radio className="size-3.5 text-accent" />
                <p className="text-xs font-semibold text-foreground">Data services in use</p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald">
                {sources.data ? "online" : "checking"}
              </span>
            </div>
            <div className="divide-y divide-line/60">
              {(sources.data?.sources || []).map((source) => (
                <a
                  key={source.name}
                  href={source.url || "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{source.name}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{source.role}</p>
                  </div>
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
                      source.available
                        ? "border-emerald/30 bg-emerald/10 text-emerald"
                        : "border-line-strong text-muted",
                    )}
                  >
                    {source.available ? "live" : "idle"}
                  </span>
                </a>
              ))}
              {!sources.data ? (
                <p className="px-4 py-5 text-[11px] text-muted">Querying service status…</p>
              ) : null}
            </div>
            <div className="border-t border-line px-4 py-2.5">
              <p className="font-mono text-[10px] text-muted">
                Credentials required: none · requests are read-only
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}