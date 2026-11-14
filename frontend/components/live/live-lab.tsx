"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Database,
  Droplets,
  ExternalLink,
  Gauge,
  Layers3,
  Loader2,
  Radar,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Timer,
} from "lucide-react";
import type { LiveChangeResult, LiveNisarGranule } from "@/types/api";
import { api, assetUrl, queryKeys } from "@/lib/api";
import { cn, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/analysis/before-after-slider";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WINDOWS = [
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
];

function pct(value: number, digits = 1) {
  return `${formatNumber(value * 100, digits)}%`;
}

function GranuleCard({ granule }: { granule: LiveNisarGranule }) {
  const [open, setOpen] = useState(false);
  const browse = granule.browse_latlon || granule.browse_thumbnail;
  return (
    <article className="overflow-hidden rounded-md border border-line bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="block w-full text-left"
        aria-expanded={open}
      >
        <div className="relative aspect-[16/9] bg-background">
          {granule.browse_thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={granule.browse_thumbnail}
              alt={`NISAR browse image, ${formatDate(granule.start)}`}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted">
              <Radar className="size-5" />
            </div>
          )}
          <div className="absolute left-2 top-2">
            <Badge variant="teal">{granule.product_level || "L1"}</Badge>
          </div>
        </div>
      </button>
      <div className="space-y-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">
            {formatDate(granule.start)}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {granule.flight_direction || "unknown orbit"}
          </p>
        </div>
        <p className="truncate font-mono text-[10px] text-muted" title={granule.id}>
          {granule.id}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted">
          <span>track {granule.track ?? "n/a"}</span>
          <span>·</span>
          <span>frame {granule.frame ?? "n/a"}</span>
          {granule.polarization?.length ? (
            <>
              <span>·</span>
              <span>{granule.polarization.join("/")}</span>
            </>
          ) : null}
        </div>
        {open && browse ? (
          <a
            href={browse}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 block overflow-hidden rounded border border-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={browse}
              alt={`Full NISAR quick-look, ${formatDate(granule.start)}`}
              className="w-full object-contain"
              loading="lazy"
            />
          </a>
        ) : null}
        {granule.download_url ? (
          <a
            href={granule.download_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 pt-1 text-[10px] text-accent-soft hover:text-accent"
          >
            ASF product page <ArrowUpRight className="size-3" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function LiveLab() {
  const searchParams = useSearchParams();
  const [slug, setSlug] = useState(searchParams.get("area") || "atchafalaya");
  const [days, setDays] = useState("90");
  const [threshold, setThreshold] = useState(3);

  const locationsQuery = useQuery({
    queryKey: queryKeys.locations,
    queryFn: api.locations,
  });
  const location = useMemo(
    () => (locationsQuery.data || []).find((item) => item.slug === slug),
    [locationsQuery.data, slug],
  );
  const bbox = location ? location.bbox.join(",") : null;

  const nisarQuery = useQuery({
    queryKey: queryKeys.liveNisar({ slug, days }),
    queryFn: () => api.liveNisar({ location: slug, days: Number(days), limit: 12 }),
    enabled: Boolean(location),
  });

  const changeMutation = useMutation({
    mutationFn: () =>
      api.liveChange({
        bbox: bbox as string,
        days: Number(days),
        threshold_db: threshold,
      }),
  });

  const result: LiveChangeResult | null = changeMutation.data || null;

  return (
    <div className="container-page pb-20 pt-10">
      <header className="max-w-3xl">
        <p className="eyebrow">Live SAR change lab</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
          Two passes over the same ground, measured
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-strong">
          Pick a monitoring area and run a change comparison on real Sentinel-1 radar
          scenes. Scene metadata and NISAR quick-looks come straight from the ASF DAAC
          catalogue. Nothing is downloaded to your machine and no NASA credentials are
          needed.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="emerald">
            <Database className="size-3" /> Sentinel-1 GRD · Earth Search / AWS Open Data
          </Badge>
          <Badge variant="teal">
            <Satellite className="size-3" /> NISAR catalogue · ASF DAAC
          </Badge>
          <Badge variant="outline">
            <Radar className="size-3" /> L-band previews, C-band pixel analysis
          </Badge>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="panel p-4">
            <div className="flex items-center gap-2">
              <Layers3 className="size-3.5 text-accent" />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Comparison setup
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs text-muted">Area</span>
                <Select value={slug} onValueChange={setSlug}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an area" />
                  </SelectTrigger>
                  <SelectContent>
                    {(locationsQuery.data || []).map((item) => (
                      <SelectItem key={item.slug} value={item.slug}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted">Search window</span>
                <Select value={days} onValueChange={setDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WINDOWS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1.5">
                <span className="flex items-center justify-between text-xs text-muted">
                  Change threshold
                  <span className="font-mono text-accent">{threshold.toFixed(1)} dB</span>
                </span>
                <input
                  type="range"
                  min={1.5}
                  max={6}
                  step={0.5}
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  className="w-full accent-[#22d3ee]"
                />
              </label>
              <Button
                className="w-full"
                onClick={() => changeMutation.mutate()}
                disabled={!bbox || changeMutation.isPending}
              >
                {changeMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Reading scenes
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-3.5" /> Run comparison
                  </>
                )}
              </Button>
              <p className="text-[10px] leading-relaxed text-muted">
                The first run reads a decimated window from two cloud-optimized scenes.
                Expect 5–20 seconds; repeated runs hit the cache.
              </p>
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radar className="size-3.5 text-teal" />
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  NISAR catalogue
                </p>
              </div>
              {nisarQuery.data?.scope === "global-fallback" ? (
                <Badge variant="muted">global</Badge>
              ) : null}
            </div>
            {nisarQuery.isLoading ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Skeleton className="aspect-[16/9] rounded-md" />
                <Skeleton className="aspect-[16/9] rounded-md" />
              </div>
            ) : nisarQuery.isError ? (
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                The ASF catalogue could not be reached. The comparison below still uses
                Sentinel-1 scenes.
              </p>
            ) : nisarQuery.data && nisarQuery.data.items.length > 0 ? (
              <>
                {nisarQuery.data.scope === "global-fallback" ? (
                  <p className="mt-2 text-[10px] leading-relaxed text-muted">
                    No NISAR granule intersects this area in the window. Showing the newest
                    acquisitions worldwide.
                  </p>
                ) : null}
                <div className="mt-3 space-y-2">
                  {nisarQuery.data.items.slice(0, 4).map((granule) => (
                    <GranuleCard key={granule.id} granule={granule} />
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                No NISAR granules matched this query.
              </p>
            )}
            <a
              href="https://search.asf.alaska.edu/"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-1 text-[10px] text-muted hover:text-foreground"
            >
              Open ASF Vertex <ArrowUpRight className="size-3" />
            </a>
          </div>
        </aside>

        <section className="space-y-4">
          {changeMutation.isError ? (
            <ErrorPanel
              title="Comparison did not run"
              message={(changeMutation.error as Error).message}
              onRetry={() => changeMutation.mutate()}
            />
          ) : changeMutation.isPending ? (
            <div className="panel space-y-3 p-5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="aspect-[16/9] w-full rounded-md" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
              </div>
              <p className="text-[11px] text-muted">
                Searching the catalogue, pairing acquisitions on the same track, and
                reading the overlap window.
              </p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Satellite className="size-3.5 text-accent" />
                    <h2 className="text-sm font-semibold text-foreground">
                      {location?.name || "Area"} · {formatDate(result.before.datetime)} to{" "}
                      {formatDate(result.after.datetime)}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.cached ? <Badge variant="muted">cached</Badge> : null}
                    <Badge variant="emerald">Same track · {result.gap_days} day gap</Badge>
                  </div>
                </div>
                <div className="mt-3">
                  <BeforeAfterSlider
                    beforeUrl={result.media_inline?.before || result.media.before}
                    afterUrl={result.media_inline?.after || result.media.after}
                    beforeDate={result.before.datetime}
                    afterDate={result.after.datetime}
                    isSynthetic={false}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    {
                      label: "Changed",
                      value: pct(result.stats.changed_fraction),
                      hint: `|ΔdB| > ${result.method.change_threshold_db.toFixed(1)}`,
                    },
                    {
                      label: "Water gained",
                      value: pct(result.stats.water_gain_fraction),
                      hint: "new low-backscatter area",
                    },
                    {
                      label: "Water lost",
                      value: pct(result.stats.water_loss_fraction),
                      hint: "was low, now rough",
                    },
                    {
                      label: "Coverage",
                      value: pct(result.stats.valid_fraction),
                      hint: "valid overlap pixels",
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="panel-flat p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        {stat.label}
                      </p>
                      <p className="metric-value mt-1 text-lg font-semibold text-foreground">
                        {stat.value}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted">{stat.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="panel p-4">
                  <div className="flex items-center gap-2">
                    <CircleDot className="size-3.5 text-violet" />
                    <h3 className="text-xs font-semibold text-foreground">Change overlay</h3>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.media_inline?.change || assetUrl(result.media.change) || ""}
                    alt="Change classification overlay: blue marks new low-backscatter water, orange marks water loss, violet marks other backscatter change"
                    className="mt-3 w-full rounded-md border border-line"
                  />
                  <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-[#228cf9]" /> water gain
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-[#fa7329]" /> water loss
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm bg-[#8c6bf9]" /> other change
                    </span>
                  </div>
                </div>

                <div className="panel p-4">
                  <div className="flex items-center gap-2">
                    <Gauge className="size-3.5 text-teal" />
                    <h3 className="text-xs font-semibold text-foreground">Scenes compared</h3>
                  </div>
                  <dl className="mt-3 space-y-2 text-[11px]">
                    {[
                      ["Earlier scene", result.before.id],
                      ["Later scene", result.after.id],
                      ["Relative orbit", String(result.before.relative_orbit ?? "n/a")],
                      ["Orbit direction", result.before.orbit_state || "n/a"],
                      [
                        "Water threshold",
                        `${result.method.water_threshold_db} dB (${result.method.water_threshold_method})`,
                      ],
                      ["Grid", `${result.grid_size} × ${result.grid_size} px · WGS84`],
                      ["Vector patches", String(result.geojson.features.length)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex gap-2">
                        <dt className="w-32 shrink-0 text-muted">{label}</dt>
                        <dd className="min-w-0 flex-1 break-all font-mono text-[10px] text-muted-strong">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 flex items-center gap-3 border-t border-line pt-2 text-[10px] text-muted">
                    <span className="flex items-center gap-1">
                      <Timer className="size-3" /> {result.elapsed_seconds}s compute
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />{" "}
                      {formatDateTime(result.computed_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-amber/25 bg-amber/[0.055] p-4">
                <div className="flex gap-2.5">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber" />
                  <div className="space-y-1 text-[11px] leading-relaxed text-muted-strong">
                    <p className="font-medium text-amber">Read the numbers with care</p>
                    <p>{result.limitations}</p>
                    <p>
                      NISAR is the mission this project is built for. Its L-band products
                      are still arriving, so pixel-level comparisons here use Sentinel-1
                      C-band as an interim. The NISAR records above are the real catalogue:
                      browse quick-looks, not calibrated products.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="panel p-2">
              <EmptyState
                icon={Droplets}
                title="No comparison yet"
                description="Pick an area and run a comparison. The service pairs two Sentinel-1 acquisitions from the same relative orbit, then measures the backscatter difference over the overlap."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}