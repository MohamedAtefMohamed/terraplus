"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock3, Radar, Satellite } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function LiveNisarFeed() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.liveNisar({ viewer: "landing" }),
    queryFn: () => api.liveNisar({ days: 30, limit: 6 }),
    staleTime: 120_000,
  });

  const items = data?.items || [];

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Radar className="size-3.5 text-teal" />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            NISAR catalogue · ASF DAAC
          </p>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
          <span className="size-1.5 rounded-full bg-emerald" />
          live query
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <Skeleton key={key} className="aspect-[4/3] rounded-none" />
          ))}
        </div>
      ) : isError || !items.length ? (
        <div className="space-y-2 px-4 py-8 text-center">
          <Satellite className="mx-auto size-5 text-muted" />
          <p className="text-xs text-muted">
            The ASF catalogue did not answer just now. Browse images appear here when the
            query succeeds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
          {items.slice(0, 6).map((granule) => {
            const href = granule.download_url || "https://search.asf.alaska.edu/";
            return (
              <a
                key={granule.id}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative block aspect-[4/3] overflow-hidden bg-background"
                title={`${granule.id} · ${formatDate(granule.start)}`}
              >
                {granule.browse_thumbnail ? (
                   
                  <img
                    src={granule.browse_thumbnail}
                    alt={`NISAR browse image acquired ${formatDate(granule.start)}`}
                    className="size-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted">
                    <Radar className="size-4" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6">
                  <span className="font-mono text-[9px] text-white/90">
                    {formatDate(granule.start, { month: "short", day: "2-digit" })}
                  </span>
                  <span className="font-mono text-[9px] uppercase text-white/60">
                    {granule.product_level || "L1"}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
        <div className="flex items-center gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <Clock3 className="size-3" />
            {data ? formatDateTime(data.queried_at) : "waiting"}
          </span>
          <span>{data ? `${data.count} granules · last 30 days` : "last 30 days"}</span>
        </div>
        <a
          href="https://search.asf.alaska.edu/"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-foreground"
        >
          ASF Vertex <ArrowUpRight className="size-3" />
        </a>
      </div>
    </div>
  );
}