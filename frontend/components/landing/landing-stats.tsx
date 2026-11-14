"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, MapPinned, Radar, Satellite } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function LandingStats() {
  const nisar = useQuery({
    queryKey: queryKeys.liveNisar({ viewer: "stats" }),
    queryFn: () => api.liveNisar({ days: 30, limit: 100 }),
    staleTime: 120_000,
  });

  const latest = nisar.data?.items?.[0];
  const stats = [
    {
      icon: Satellite,
      label: "NISAR granules · 30 days",
      value: nisar.isLoading ? null : String(nisar.data?.count ?? 0),
      sub: "ASF DAAC catalogue",
    },
    {
      icon: CalendarClock,
      label: "Latest acquisition",
      value: nisar.isLoading ? null : latest ? formatDate(latest.start) : "none",
      sub: latest ? `${latest.flight_direction || "orbit"} · ${latest.product_level || "L1"}` : "no record",
    },
    {
      icon: MapPinned,
      label: "Monitoring areas",
      value: "3",
      sub: "delta and basin sites",
    },
    {
      icon: Radar,
      label: "Change engine",
      value: "C-band",
      sub: "Sentinel-1 GRD, live reads",
    },
  ];

  return (
    <div className="grid h-full grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-2 text-muted">
              <Icon className="size-3.5 text-accent" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">{item.label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold metric-value text-foreground">
              {item.value === null ? <Skeleton className="h-7 w-16" /> : item.value}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              {nisar.isError ? "ASF catalogue unavailable right now" : item.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}