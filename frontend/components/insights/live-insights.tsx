"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BrainCircuit, FlaskConical, Info, ShieldAlert } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
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
import { AnalysisCharts } from "@/components/insights/analysis-charts";

export function LiveInsights() {
  const [slug, setSlug] = useState("atchafalaya");
  const locationsQuery = useQuery({ queryKey: queryKeys.locations, queryFn: api.locations });
  const analysesQuery = useQuery({
    queryKey: queryKeys.analyses({ live: true }),
    queryFn: () => api.analyses(),
  });

  const analysis = useMemo(
    () => (analysesQuery.data || []).find((item) => item.location_slug === slug),
    [analysesQuery.data, slug],
  );

  const explanationQuery = useQuery({
    queryKey: queryKeys.explanation(analysis?.id ?? 0),
    queryFn: () => api.explanation(analysis!.id),
    enabled: Boolean(analysis),
  });

  const statisticsQuery = useQuery({
    queryKey: ["analysis-statistics", analysis?.id ?? 0],
    queryFn: () => api.statistics(analysis!.id),
    enabled: Boolean(analysis),
  });

  const explanation = explanationQuery.data;

  return (
    <div className="container-page py-8 lg:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="eyebrow">Interpretation</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
            What the comparison supports
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            A deterministic reading of a live Sentinel-1 comparison: the measurements, the
            plausible drivers, and the claims the data cannot support.
          </p>
        </div>
        <Select value={slug} onValueChange={setSlug}>
          <SelectTrigger className="w-[220px]">
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
      </header>

      {analysesQuery.isError ? (
        <ErrorPanel
          className="mt-6"
          message={(analysesQuery.error as Error).message}
          onRetry={() => analysesQuery.refetch()}
        />
      ) : null}

      {analysesQuery.isLoading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : null}

      {analysesQuery.data && !analysesQuery.data.length ? (
        <div className="panel mt-6 p-2">
          <EmptyState
            icon={BrainCircuit}
            title="No comparison cached yet"
            description="Explanations are generated from measured comparisons. Run one in the live lab for this area, then return here."
            action={
              <Link href={`/live?area=${slug}`} className={cn(buttonVariants({ size: "sm" }))}>
                Open the live lab <ArrowRight className="size-3.5" />
              </Link>
            }
          />
        </div>
      ) : null}

      {analysesQuery.data?.length && !analysis ? (
        <Callout tone="info" className="mt-6" title="No cached comparison for this area">
          Pick another area, or run a comparison in the live lab.
        </Callout>
      ) : null}

      {explanationQuery.isError ? (
        <ErrorPanel
          className="mt-6"
          message={(explanationQuery.error as Error).message}
          onRetry={() => explanationQuery.refetch()}
        />
      ) : null}

      {explanationQuery.isLoading ? <Skeleton className="mt-6 h-64 w-full rounded-lg" /> : null}

      {explanation ? (
        <div className="mt-6 space-y-4">
          <section className="panel p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="emerald">deterministic</Badge>
              <Badge variant="outline">live comparison</Badge>
              <Badge variant="muted">
                confidence {explanation.confidence.label} ·{" "}
                {formatNumber(explanation.confidence.score, 2)}
              </Badge>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-foreground">
              {explanation.headline}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-strong">
              {explanation.summary}
            </p>
          </section>

          {statisticsQuery.data ? (
            <AnalysisCharts statistics={statisticsQuery.data} />
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="panel p-5">
              <div className="flex items-center gap-2">
                <FlaskConical className="size-3.5 text-accent" />
                <h3 className="text-xs font-semibold text-foreground">Measurements</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {explanation.observations.map((row) => (
                  <li key={row} className="flex gap-2 text-[11px] leading-relaxed text-muted-strong">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                    {row}
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel p-5">
              <div className="flex items-center gap-2">
                <Info className="size-3.5 text-teal" />
                <h3 className="text-xs font-semibold text-foreground">What it may mean</h3>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-strong">
                {explanation.interpretation}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                {explanation.environmental_relevance}
              </p>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <section className="panel p-5">
              <h3 className="text-xs font-semibold text-foreground">Method</h3>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
                {Object.entries(explanation.method).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2 border-b border-line/60 py-1">
                    <dt className="text-muted">{key.replaceAll("_", " ")}</dt>
                    <dd className="font-mono text-[10px] text-muted-strong">{String(value)}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted">
                {explanation.sources.map((source, index) => (
                  <a
                    key={`${source.url || index}`}
                    href={source.url || "#"}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-foreground"
                  >
                    {source.label || source.name || "source"}
                  </a>
                ))}
              </div>
            </section>

            <section className="panel p-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-3.5 text-amber" />
                <h3 className="text-xs font-semibold text-foreground">Limits</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {explanation.limitations.map((row) => (
                  <li key={row} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber" />
                    {row}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}