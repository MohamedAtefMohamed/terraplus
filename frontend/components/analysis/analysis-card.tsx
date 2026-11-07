import Link from "next/link";
import { ArrowRight, CalendarDays, Droplets } from "lucide-react";
import type { AnalysisSummary } from "@/types/api";
import { assetUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export function AnalysisCard({ analysis, compact = false }: { analysis: AnalysisSummary; compact?: boolean }) {
  return (
    <Link
      href={`/analysis?analysis=${analysis.id}`}
      className="panel panel-hover group block overflow-hidden"
    >
      <div className="flex">
        <div className="grid w-28 shrink-0 grid-cols-2 border-r border-line bg-background">
          <img
            src={assetUrl(analysis.before_preview_url) || ""}
            alt=""
            className="h-full min-h-[104px] w-full object-cover opacity-75 transition-opacity group-hover:opacity-100"
          />
          <img
            src={assetUrl(analysis.after_preview_url) || ""}
            alt=""
            className="h-full min-h-[104px] w-full border-l border-line/70 object-cover opacity-85 transition-opacity group-hover:opacity-100"
          />
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{analysis.location_name}</p>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-muted">
                <CalendarDays className="size-2.5" />
                {analysis.before_date} → {analysis.after_date}
              </p>
            </div>
            <Badge variant="amber">DEMO</Badge>
          </div>

          {!compact ? (
            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted">
              {analysis.summary}
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Δ area</p>
              <p className="mt-0.5 text-[11px] font-medium text-foreground">
                {formatNumber(analysis.change_area_km2, 0)} km²
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Water gain
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-accent">
                <Droplets className="size-2.5" />
                {formatNumber(analysis.water_gain_km2, 0)} km²
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-emerald">
              {analysis.confidence_label}
              <ArrowRight className="size-3 opacity-50 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}