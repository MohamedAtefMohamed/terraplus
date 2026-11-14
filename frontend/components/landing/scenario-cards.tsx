"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Radar } from "lucide-react";
import type { Location } from "@/types/api";
import { api, queryKeys } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function AreaCard({ location }: { location: Location }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.liveNisar({ area: location.slug }),
    queryFn: () => api.liveNisar({ location: location.slug, days: 90, limit: 3 }),
    staleTime: 180_000,
  });

  const latest = data?.items?.[0];
  const thumbnail = latest?.browse_thumbnail;

  return (
    <article className="panel panel-hover group flex flex-col overflow-hidden">
      <div className="relative h-36 overflow-hidden border-b border-line bg-background">
        {isLoading ? (
          <Skeleton className="size-full rounded-none" />
        ) : thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
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
              <p className="mt-1 text-[10px] text-muted">No granule in the last 90 days</p>
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge variant={thumbnail ? "emerald" : "muted"} className="bg-[#080a0c]/80 backdrop-blur">
            {thumbnail ? "NISAR browse" : "catalogue only"}
          </Badge>
        </div>
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-strong">
            {latest ? formatDate(latest.start) : location.name}
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
          <Link
            href={`/live?area=${location.slug}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-accent transition-colors hover:text-accent-soft"
          >
            Run a comparison <ArrowRight className="size-3" />
          </Link>
          <span className="font-mono text-[10px] text-muted">
            {data ? `${data.count} NISAR records · 90d` : "querying ASF"}
          </span>
        </div>
      </div>
    </article>
  );
}

export function ScenarioCards() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.locations,
    queryFn: api.locations,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="panel overflow-hidden">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-line bg-surface/60 p-6 text-sm text-muted">
        Monitoring areas are unavailable while the API is offline.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {data.map((location) => (
        <AreaCard key={location.slug} location={location} />
      ))}
    </div>
  );
}