"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  Check,
  ClipboardCopy,
  Cpu,
  Gauge,
  Globe2,
  Info,
  Loader2,
  RefreshCw,
  Satellite,
  Search,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import type { AnalysisSummary } from "@/types/api";
import { api, queryKeys } from "@/lib/api";
import { cn, confidenceTone, formatNumber, percent } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { Meter } from "@/components/ui/meter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Section({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: typeof Info;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line/70 px-5 py-5 first:border-0">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-accent" />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
      </div>
      <h3 className="mt-1.5 text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function InsightsView() {
  const searchParams = useSearchParams();
  const initial = Number(searchParams.get("analysis"));
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isFinite(initial) && initial > 0 ? initial : null,
  );
  const [locationFilter, setLocationFilter] = useState("all");
  const [search, setSearch] = useState("");

  const analysesQuery = useQuery({
    queryKey: queryKeys.analyses({ limit: 60 }),
    queryFn: () => api.analyses({ limit: 60 }),
  });
  const configQuery = useQuery({ queryKey: queryKeys.config, queryFn: api.config });

  const filtered = useMemo(() => {
    const rows = analysesQuery.data || [];
    return rows.filter((analysis) => {
      if (locationFilter !== "all" && analysis.location_slug !== locationFilter) return false;
      if (search) {
        const haystack = `${analysis.location_name} ${analysis.before_date} ${analysis.after_date}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [analysesQuery.data, locationFilter, search]);

  const selected: AnalysisSummary | null =
    analysesQuery.data?.find((analysis) => analysis.id === selectedId) || filtered[0] || null;

  useEffect(() => {
    if (selectedId === null && filtered.length) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const explanationQuery = useQuery({
    queryKey: queryKeys.explanation(selected?.id || 0),
    queryFn: () => api.explanation(selected?.id as number),
    enabled: Boolean(selected?.id),
  });

  const explanation = explanationQuery.data;
  const tone = explanation ? confidenceTone(explanation.confidence.label) : "emerald";

  const locationOptions = useMemo(() => {
    const map = new Map<string, string>();
    (analysesQuery.data || []).forEach((analysis) => {
      map.set(analysis.location_slug, analysis.location_name);
    });
    return Array.from(map.entries());
  }, [analysesQuery.data]);

  const copyExplanation = async () => {
    if (!explanation) return;
    const text = [
      `TerraPulse explanation — ${explanation.headline}`,
      "",
      explanation.summary,
      "",
      "Observed facts:",
      ...explanation.observations.map((item) => `- ${item}`),
      "",
      `Interpretation: ${explanation.interpretation}`,
      "",
      `Confidence: ${explanation.confidence.label} (${explanation.confidence.score.toFixed(2)}) — ${explanation.confidence.important}`,
      "",
      `Disclaimer: ${explanation.disclaimer}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Explanation copied to clipboard");
    } catch {
      toast.error("Clipboard access was blocked by the browser");
    }
  };

  const choose = (analysis: AnalysisSummary) => {
    setSelectedId(analysis.id);
  };

  return (
    <div className="container-page py-8 lg:py-10">
      <PageHeader
        eyebrow="AI insights"
        title="Observations, interpretation, uncertainty"
        description="The explanation engine translates analysis outputs into careful language. It separates what was measured from what it might mean, and it never requires an external API key."
        actions={
          <>
            <Badge variant={configQuery.data?.llm.enabled ? "violet" : "accent"}>
              {configQuery.data?.llm.enabled ? "LLM narration" : "Deterministic engine"}
            </Badge>
            <Link href="/methodology" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Method <BookOpen className="size-3.5" />
            </Link>
          </>
        }
      />

      {analysesQuery.isError ? (
        <ErrorPanel
          message={(analysesQuery.error as Error).message}
          onRetry={() => analysesQuery.refetch()}
          className="mt-4"
        />
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold">Analysis library</h2>
              <Badge variant="outline">{filtered.length}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search area or date..."
                  aria-label="Search analyses"
                  className="w-full rounded-md border border-line bg-surface py-2 pl-8 pr-2.5 text-[11px] text-foreground placeholder:text-muted/70 outline-none focus:border-accent/50"
                />
              </div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-8 text-[10px]" aria-label="Filter by monitoring area">
                  <SelectValue placeholder="All areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All areas</SelectItem>
                  {locationOptions.map(([slug, name]) => (
                    <SelectItem key={slug} value={slug}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="scrollbar-thin max-h-[620px] space-y-1.5 overflow-y-auto pr-1">
            {analysesQuery.isLoading ? (
              <>
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </>
            ) : filtered.length ? (
              filtered.map((analysis) => (
                <button
                  key={analysis.id}
                  type="button"
                  onClick={() => choose(analysis)}
                  className={cn(
                    "w-full rounded-md border p-3 text-left transition-colors",
                    selected?.id === analysis.id
                      ? "border-accent/40 bg-accent/[0.06]"
                      : "border-line bg-surface/45 hover:border-line-strong",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-foreground">{analysis.location_name}</p>
                    <Badge
                      variant={
                        analysis.confidence_label === "High"
                          ? "emerald"
                          : analysis.confidence_label === "Moderate"
                            ? "amber"
                            : "danger"
                      }
                      className="text-[10px]"
                    >
                      {analysis.confidence_label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-[10.5px] text-muted">
                    {analysis.before_date} → {analysis.after_date}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                    {analysis.summary}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between font-mono text-[10.5px] text-muted">
                    <span>Δ {formatNumber(analysis.change_area_km2, 0)} km²</span>
                    <span className="text-accent">
                      water {analysis.net_water_change_km2 >= 0 ? "+" : ""}
                      {formatNumber(analysis.net_water_change_km2, 0)} km²
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No matching analyses"
                description="Clear the filters or run a new comparison."
                action={
                  <Link href="/analysis" className={cn(buttonVariants({ size: "sm" }))}>
                    Run comparison
                  </Link>
                }
              />
            )}
          </div>
        </aside>

        <div className="min-w-0">
          {!selected ? (
            <div className="panel flex min-h-[420px] items-center justify-center p-8">
              <EmptyState
                icon={BrainCircuit}
                title="No analysis selected"
                description="Choose a saved comparison from the library, or run a new one to generate an explanation."
                action={
                  <Link href="/analysis" className={cn(buttonVariants({ size: "sm" }))}>
                    Run a comparison <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="panel overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={explanation?.mode === "llm" ? "violet" : "accent"}>
                      {explanation?.mode === "llm" ? "LLM narration" : "Deterministic explanation"}
                    </Badge>
                    <Badge variant={selected.is_synthetic ? "amber" : "emerald"}>
                      {selected.is_synthetic ? "SYNTHETIC DEMO" : "SAMPLE · ATTRIBUTED"}
                    </Badge>
                    {explanation ? (
                      <Badge
                        variant={tone === "emerald" ? "emerald" : tone === "amber" ? "amber" : "danger"}
                      >
                        {explanation.confidence.label} processing quality
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    {selected.location_name}
                  </h2>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    {selected.before_date} → {selected.after_date} · analysis #{selected.id}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyExplanation}
                    disabled={!explanation}
                  >
                    <ClipboardCopy className="size-3.5" /> Copy
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => explanationQuery.refetch()}
                    disabled={explanationQuery.isFetching}
                  >
                    <RefreshCw className={cn("size-3.5", explanationQuery.isFetching && "animate-spin")} />
                    Regenerate
                  </Button>
                  <Link
                    href={`/analysis?analysis=${selected.id}`}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    Analysis <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </div>

              {explanationQuery.isLoading ? (
                <div className="space-y-4 p-5">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : explanationQuery.isError ? (
                <div className="p-5">
                  <ErrorPanel
                    title="Explanation engine unavailable"
                    message={(explanationQuery.error as Error).message}
                    onRetry={() => explanationQuery.refetch()}
                  />
                </div>
              ) : explanation ? (
                <div>
                  <div className="bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.08),transparent_60%)] px-5 py-6">
                    <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                      <Sparkles className="size-3" /> {explanation.engine}
                    </p>
                    <h2 className="mt-2 max-w-3xl text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
                      {explanation.headline}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-strong">
                      {explanation.summary}
                    </p>
                    {explanation.note ? (
                      <p className="mt-3 font-mono text-[10px] text-amber">{explanation.note}</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-px border-y border-line bg-line sm:grid-cols-3">
                    <div className="bg-surface/80 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        Analysis period
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-foreground">
                        {explanation.analysis_period.before} → {explanation.analysis_period.after}
                      </p>
                    </div>
                    <div className="bg-surface/80 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        Confidence
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[11px] font-medium text-emerald">
                          {explanation.confidence.label}
                        </span>
                        <Meter value={explanation.confidence.score} tone={tone} className="flex-1" />
                        <span className="font-mono text-[10px] text-muted">
                          {explanation.confidence.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-surface/80 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        Data source
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-foreground">
                        {selected.is_synthetic ? "Synthetic demo scenes" : "Staged observation data"}
                      </p>
                    </div>
                  </div>

                  <Section icon={Satellite} eyebrow="Observed" title="What the analysis measured">
                    <ul className="space-y-2">
                      {explanation.observations.map((observation) => (
                        <li
                          key={observation}
                          className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-strong"
                        >
                          <Check className="mt-0.5 size-3 shrink-0 text-emerald" />
                          {observation}
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <Section icon={BrainCircuit} eyebrow="Interpreted" title="What it may mean">
                    <p className="text-[11px] leading-relaxed text-muted-strong">
                      {explanation.interpretation}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-amber/20 bg-amber/[0.045] p-3">
                        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber">
                          <AlertTriangle className="size-3" /> Do not conclude
                        </p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-strong">
                          That a flood occurred, that damage exists, or that a specific
                          environmental cause is established.
                        </p>
                      </div>
                      <div className="rounded-md border border-emerald/20 bg-emerald/[0.045] p-3">
                        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald">
                          <Check className="size-3" /> Safe to conclude
                        </p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-strong">
                          That the radar signal crossed the configured thresholds and that the
                          processing quality passed the stated checks.
                        </p>
                      </div>
                    </div>
                  </Section>

                  <Section icon={Globe2} eyebrow="Context" title="Environmental relevance">
                    <p className="text-[11px] leading-relaxed text-muted-strong">
                      {explanation.environmental_relevance}
                    </p>
                  </Section>

                  <Section icon={Gauge} eyebrow="Indicators" title="Technical measurements">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {explanation.technical_indicators.map((indicator) => (
                        <div
                          key={indicator.label}
                          className="rounded-md border border-line bg-surface/60 p-3"
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-muted">
                            {indicator.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {indicator.value === null ? "—" : formatNumber(indicator.value, 2)}
                            <span className="ml-1 text-[10px] font-normal text-muted">
                              {indicator.unit}
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted">
                            {indicator.meaning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section icon={Cpu} eyebrow="Method" title={explanation.method.name}>
                    <ol className="space-y-1.5">
                      {explanation.method.steps.map((step, index) => (
                        <li
                          key={step}
                          className="flex gap-2 text-[11px] leading-relaxed text-muted-strong"
                        >
                          <span className="font-mono text-[10px] text-accent">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 font-mono text-[10px] text-muted">
                      threshold ±{explanation.method.change_threshold_db.toFixed(1)} dB · water
                      indicator &lt; {explanation.method.water_threshold_db.toFixed(1)} dB
                    </p>
                  </Section>

                  <Section icon={ShieldCheck} eyebrow="Uncertainty" title="Confidence and limitations">
                    <div className="rounded-md border border-line bg-surface/60 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-foreground">
                          {explanation.confidence.label} · {percent(explanation.confidence.score * 100, 0)}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                          processing quality
                        </span>
                      </div>
                      <Meter value={explanation.confidence.score} tone={tone} className="mt-2" />
                      <p className="mt-2 text-[11px] leading-relaxed text-muted">
                        {explanation.confidence.rationale}
                      </p>
                      <p className="mt-2 text-[11px] leading-relaxed text-amber/90">
                        {explanation.confidence.important}
                      </p>
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {explanation.limitations.map((limitation) => (
                        <li
                          key={limitation}
                          className="flex items-start gap-2 text-[11px] leading-relaxed text-muted"
                        >
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-line-strong" />
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <Section icon={Waves} eyebrow="Provenance" title="Source data">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {explanation.source_data.map((source) => (
                        <div
                          key={source.role}
                          className="rounded-md border border-line bg-surface/60 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
                              {source.role}
                            </p>
                            <Badge variant={source.is_synthetic ? "amber" : "emerald"} className="text-[10px]">
                              {source.is_synthetic ? "SYNTHETIC" : "SAMPLE"}
                            </Badge>
                          </div>
                          <p className="mt-1.5 break-all font-mono text-[11px] leading-relaxed text-foreground">
                            {source.external_id}
                          </p>
                          <p className="mt-1 text-[10px] text-muted">
                            {source.mission} · {source.instrument}
                          </p>
                          <p className="mt-1 text-[10px] text-muted">
                            {source.acquired_at.slice(0, 10)} · {source.source_name}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {explanation.sources.map((source) =>
                        source.url ? (
                          <a
                            key={source.name}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent-soft"
                          >
                            {source.name} <ArrowUpRight className="size-3" />
                          </a>
                        ) : (
                          <span key={source.name} className="text-[10px] text-muted">
                            {source.name}
                          </span>
                        ),
                      )}
                    </div>
                  </Section>

                  <div className="border-t border-line bg-[#07101c] px-5 py-4">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 size-3.5 shrink-0 text-muted" />
                      <p className="text-[11px] leading-relaxed text-muted">
                        {explanation.disclaimer}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted" />
                </div>
              )}
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Callout tone="info" title="How AI narration works">
              {configQuery.data?.llm.enabled
                ? "An optional LLM can rewrite four narrative fields from the deterministic facts. Statistics, quality and limitations are never generated by the model."
                : "No LLM key is configured. TerraPulse is using its deterministic rule-based engine, which is fully functional offline and produces the same structured explanation."}
            </Callout>
            <Callout tone="warning" title="Scientific boundary">
              Explanations are decision-support context for a demonstration dataset. They are not
              scientific findings, emergency guidance or validated hazard assessments.
            </Callout>
          </div>
        </div>
      </div>
    </div>
  );
}