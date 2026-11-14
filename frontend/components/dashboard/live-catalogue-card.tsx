"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Radar } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function LiveCatalogueCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.liveNisar({ viewer: "dashboard" }),
    queryFn: () => api.liveNisar({ days: 30, limit: 8 }),
    staleTime: 120_000,
  });

  const items = data?.items || [];

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Radar className="size-3.5 text-teal" />
          <h2 className="text-xs font-semibold text-foreground">NISAR catalogue, last 30 days</h2>
        </div>
        <div className="flex items-center gap-2">
          {data ? <Badge variant="emerald">{data.count} records</Badge> : null}
          <Link
            href="/live"
            className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-soft"
          >
            Live lab <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="aspect-[4/3] rounded-none" />
          ))}
        </div>
      ) : isError || !items.length ? (
        <p className="px-5 py-6 text-xs text-muted">
          ASF did not answer the catalogue query. The rest of the dashboard is unaffected.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {items.slice(0, 8).map((granule) => (
            <a
              key={granule.id}
              href={granule.download_url || "https://search.asf.alaska.edu/"}
              target="_blank"
              rel="noreferrer noopener"
              className="group relative block aspect-[4/3] overflow-hidden bg-background"
              title={`${granule.id} · ${formatDate(granule.start)}`}
            >
              {granule.browse_thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={granule.browse_thumbnail}
                  alt={`NISAR browse image ${formatDate(granule.start)}`}
                  className="size-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted">
                  <Radar className="size-4" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-5">
                <span className="font-mono text-[9px] text-white/90">
                  {formatDate(granule.start, { month: "short", day: "2-digit" })}
                </span>
                <span className="font-mono text-[9px] uppercase text-white/60">
                  {granule.product_level || "L1"}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-2.5 text-[10px] text-muted">
        <span>
          {data?.scope === "global-fallback"
            ? "No intersection with the monitored areas in the window; showing the newest acquisitions worldwide."
            : "Records intersect the monitored areas. Browse images are amplitude quick-looks."}
        </span>
        <a
          href="https://search.asf.alaska.edu/"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          ASF Vertex <ArrowUpRight className="size-3" />
        </a>
      </div>
    </section>
  );
}