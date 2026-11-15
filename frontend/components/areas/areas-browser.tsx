"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AreaCard } from "@/components/areas/area-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPinned, SearchX } from "lucide-react";

const ICONS: Record<string, string> = {
  "Flood & wetland": "Flood · wetland",
  "Ice & snow": "Ice · snow",
  "Sea ice & coast": "Sea ice",
  Wildfire: "Fire",
  Agriculture: "Agriculture",
  Subsidence: "Subsidence",
  Volcanism: "Volcano",
};

export function AreasBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.locations,
    queryFn: api.locations,
    refetchInterval: (query) => {
      const rows = query.state.data;
      return rows?.some((row) => row.observation_count == null) ? 12000 : false;
    },
  });

  const locations = useMemo(() => data || [], [data]);

  const categories = useMemo(
    () => [...new Set(locations.map((item) => item.category))].sort(),
    [locations],
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return locations.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!text) return true;
      return [item.name, item.region, item.country, item.focus, item.category, item.slug]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [locations, query, category]);

  return (
    <div className="container-page py-10">
      <header className="max-w-3xl space-y-2.5">
        <p className="eyebrow">Monitoring areas</p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
          Every study site on the platform
        </h1>
        <p className="text-sm leading-relaxed text-muted-strong">
          Each area is a real bounding box with a live NISAR catalogue query and a live Sentinel-1
          change comparison. Areas span deltas and floodplains, ice sheets and sea ice, fire
          scars, croplands, subsiding cities, and an active volcano.
        </p>
      </header>

      <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              category === "all"
                ? "border-white/60 bg-white/[0.08] text-foreground"
                : "border-white/10 text-muted hover:border-white/30 hover:text-foreground",
            )}
          >
            All {locations.length}
          </button>
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                category === name
                  ? "border-white/60 bg-white/[0.08] text-foreground"
                  : "border-white/10 text-muted hover:border-white/30 hover:text-foreground",
              )}
            >
              {ICONS[name] || name}
              <span className="ml-1.5 text-muted/70">
                {locations.filter((item) => item.category === name).length}
              </span>
            </button>
          ))}
        </div>

        <label className="relative block w-full lg:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, region or country"
            aria-label="Search monitoring areas"
            className="w-full rounded-md border border-white/10 bg-[#0d0d0f] py-2 pl-8 pr-2.5 text-[11px] text-foreground outline-none placeholder:text-muted/70 focus:border-white/30"
          />
        </label>
      </div>

      {isError ? (
        <ErrorPanel
          className="mt-6"
          message={(error as Error).message}
          onRetry={() => refetch()}
        />
      ) : null}

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="panel overflow-hidden">
              <Skeleton className="h-36 w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((location) => (
            <AreaCard key={location.slug} location={location} />
          ))}
        </div>
      ) : locations.length ? (
        <div className="panel mt-6 p-2">
          <EmptyState
            icon={SearchX}
            title="No area matches that filter"
            description="Try a different category or clear the search text."
          />
        </div>
      ) : (
        <div className="panel mt-6 p-2">
          <EmptyState
            icon={MapPinned}
            title="Area list unavailable"
            description="The API did not return the monitoring areas. Check the backend and retry."
          />
        </div>
      )}
    </div>
  );
}