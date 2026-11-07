import Link from "next/link";
import { ArrowRight, Database, FlaskConical, Satellite } from "lucide-react";
import type { DataStatus } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DataModePanel({ data }: { data: DataStatus }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="size-3.5 text-accent" />
          <h3 className="text-xs font-semibold text-foreground">Data integrity</h3>
        </div>
        <Badge variant={data.is_synthetic ? "amber" : "emerald"}>{data.label}</Badge>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        TerraPulse keeps data origin visible in every view. No synthetic scene is ever presented
        as a NASA acquisition.
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface/70 p-2.5">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-amber" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground">{data.label}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              {data.analysis_mode === "demo"
                ? "Synthetic SAR backscatter, real coordinates. Generated locally and shown offline."
                : "Staged sample observations are available; every record carries its own source and mode."}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface/70 p-2.5">
          <Database className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground">
              SAMPLE · {data.sample.available ? "staged" : "not staged"}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              {data.sample.note}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface/70 p-2.5">
          <Satellite className="mt-0.5 size-3.5 shrink-0 text-emerald" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground">
              LIVE · metadata only
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              {data.live.enabled
                ? "ASF NISAR granule discovery enabled. Product download requires Earthdata Login."
                : "Live discovery is disabled by configuration."}
            </p>
          </div>
        </div>
      </div>

      {data.fallback_reason ? (
        <p className="mt-3 rounded border border-amber/20 bg-amber/[0.05] px-2.5 py-2 text-[11px] leading-relaxed text-amber/90">
          {data.fallback_reason}
        </p>
      ) : null}

      <Link
        href="/methodology#data-modes"
        className={cn(
          "mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-soft",
        )}
      >
        Read data-mode policy <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}