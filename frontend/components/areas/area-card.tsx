"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Radar } from "lucide-react";
import type { Location } from "@/types/api";
import { api, queryKeys } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function AreaCard({ location }: { location: Location }) {
  // One cheap catalogue query per card (a single granule) — no shared warm state,
  // so every deployment instance returns the same answer.
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.liveNisar({ area: location.slug, limit: 1 }),
    queryFn: () => api.liveNisar({ location: location.slug, days: 365, limit: 1 }),
    staleTime: 600_000,
  });

  const latest = data?.items?.[0] || null;
  const thumbnail = latest?.browse_thumbnail || latest?.browse_latlon;

  return (
    <article className="panel panel-hover group flex flex-col overflow-hidden">
      <div className="relative h-36 overflow-hidden border-b border-line bg-background">
        {isLoading ? (
          <Skeleton className="size-full rounded-none" />
        ) : thumbnail ? (
           
          <img
            src={thumbnail}
            alt={`NISAR browse image over ${location.name}, ${formatDate(latest?.start)}`}
            className="size-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <div className="text-center">
              <Radar className="mx-auto size-5 text-muted" />
              <p className="mt-1 text-[10px] text-muted">No granule in the last year</p>
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="accent" className="bg-[#111114]/80 backdrop-blur">
            {location.category}
          </Badge>
          {thumbnail ? (
            <Badge variant="emerald" className="bg-[#111114]/80 backdrop-blur">
              NISAR
            </Badge>
          ) : null}
        </div>
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-strong">
            {latest?.start ? formatDate(latest.start) : location.name}
          </span>
          <span className="font-mono text-[10px] text-muted">
            {location.bbox[0].toFixed(2)}°, {location.bbox[1].toFixed(2)}°
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {location.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
              <MapPin className="size-3" />
              {location.region} · {location.country}
            </p>
          </div>
          <Badge variant="outline">{location.focus.split("&")[0].trim()}</Badge>
        </div>

        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted">
          {location.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/70 pt-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/live?area=${location.slug}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent transition-colors hover:text-accent-soft"
            >
              Compare <ArrowRight className="size-3" />
            </Link>
            <Link
              href={`/map?location=${location.slug}`}
              className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-foreground"
            >
              Map
            </Link>
          </div>
          <span className="font-mono text-[10px] text-muted">
            {latest?.start ? `latest ${formatDate(latest.start)}` : "no recent granule"}
          </span>
        </div>
      </div>
    </article>
  );
}