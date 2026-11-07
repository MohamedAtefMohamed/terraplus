"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Layers3, MapPinned, ShieldCheck } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export function LandingStats() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: api.dashboard,
  });

  const stats = [
    {
      icon: MapPinned,
      label: "Demo regions",
      value: isLoading ? null : String(data?.stats.locations ?? 0),
      sub: "Real coordinates, synthetic radar",
    },
    {
      icon: Layers3,
      label: "Observations",
      value: isLoading ? null : String(data?.stats.observations ?? 0),
      sub: "Four dates per demonstration area",
    },
    {
      icon: Activity,
      label: "Comparisons",
      value: isLoading ? null : String(data?.stats.analyses ?? 0),
      sub: "Persisted change analyses",
    },
    {
      icon: ShieldCheck,
      label: "Synthetic labelling",
      value: "100%",
      sub: "Every demo pixel is disclosed",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="bg-surface/90 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-muted">
              <Icon className="size-3.5 text-accent" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">{item.label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold metric-value text-foreground">
              {item.value === null ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                item.value
              )}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              {isError ? "API offline · start the backend" : item.sub}
            </p>
          </div>
        );
      })}
    </div>
  );
}
