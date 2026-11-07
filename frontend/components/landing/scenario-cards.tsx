"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Droplets, MapPin } from "lucide-react";
import { api, assetUrl, queryKeys } from "@/lib/api";
import { formatNumber, percent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
        Scenario cards are unavailable while the API is offline. Start the FastAPI backend and
        refresh this page.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {data.map((location, index) => {
        const analysis = location.latest_analysis;
        return (
          <article
            key={location.slug}
            className="panel panel-hover group flex flex-col overflow-hidden"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="relative h-36 overflow-hidden border-b border-line bg-background">
              <div className="grid h-full grid-cols-2">
                <img
                  src={assetUrl(analysis?.before_preview_url) || ""}
                  alt=""
                  className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <img
                  src={assetUrl(analysis?.after_preview_url) || ""}
                  alt=""
                  className="h-full w-full border-l border-line/60 object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#08101c] via-transparent to-transparent" />
              <div className="absolute left-3 top-3 flex items-center gap-1.5">
                <Badge
                  variant={location.is_demo ? "amber" : "emerald"}
                  className="bg-[#08101c]/80 backdrop-blur"
                >
                  {location.is_demo ? "SYNTHETIC DEMO" : "SAMPLE · ATTRIBUTED"}
                </Badge>
              </div>
              <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-strong">
                  {analysis ? `${analysis.before_date} → ${analysis.after_date}` : "Demonstration AOI"}
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

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/70 pt-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    Scenes
                  </p>
                  <p className="mt-1 text-sm font-semibold metric-value">
                    {location.observation_count}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    Δ area
                  </p>
                  <p className="mt-1 text-sm font-semibold metric-value">
                    {analysis ? `${formatNumber(analysis.change_area_km2, 0)} km²` : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    Quality
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald">
                    {analysis ? percent(analysis.confidence_score * 100, 0) : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 pt-1">
                <Link
                  href={`/map?location=${location.slug}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent transition-colors hover:text-accent-soft"
                >
                  Explore map <ArrowRight className="size-3" />
                </Link>
                <div className="flex items-center gap-3 text-[10px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3" /> {location.observation_count} dates
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="size-3 text-accent" /> wetland
                  </span>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}