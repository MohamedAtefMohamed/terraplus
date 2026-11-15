"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AreaCard } from "@/components/areas/area-card";
import { Skeleton } from "@/components/ui/skeleton";

/** One representative area per hazard category, so the landing stays compact. */
const FEATURED = [
  "sundarbans",
  "ilulissat",
  "kilauea",
  "iowa-cropland",
  "jakarta",
  "pantanal",
];

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

  const featured = FEATURED.map((slug) => data.find((item) => item.slug === slug)).filter(
    (item): item is (typeof data)[number] => Boolean(item),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((location) => (
          <AreaCard key={location.slug} location={location} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-5">
        <p className="text-[11px] text-muted">
          {featured.length} of {data.length} monitoring areas shown. Every area runs the same live
          catalogue query and change comparison.
        </p>
        <Link href="/areas" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Browse all {data.length} areas <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}