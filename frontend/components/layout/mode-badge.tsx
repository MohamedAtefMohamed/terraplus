"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Activity, FlaskConical, Satellite, Sparkles } from "lucide-react";
import { api, queryKeys } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const styles = {
  demo: {
    label: "DEMO DATA",
    icon: FlaskConical,
    className: "border-amber/30 bg-amber/10 text-amber",
  },
  sample: {
    label: "SAMPLE DATA",
    icon: Satellite,
    className: "border-accent/30 bg-accent/10 text-accent",
  },
  live: {
    label: "LIVE DISCOVERY",
    icon: Activity,
    className: "border-emerald/30 bg-emerald/10 text-emerald",
  },
  llm: {
    label: "AI NARRATION",
    icon: Sparkles,
    className: "border-violet/30 bg-violet/10 text-violet",
  },
} as const;

export function ModeBadge({ className }: { className?: string }) {
  const { data } = useQuery({ queryKey: queryKeys.config, queryFn: api.config });
  const mode = data?.data;
  const effective = (mode?.analysis_mode === "demo" ? "demo" : mode?.effective_mode) || "demo";
  const config = styles[effective as keyof typeof styles] || styles.demo;
  const Icon = config.icon;
  const label =
    data?.nisar.enabled && mode?.effective_mode === "live" ? "NISAR LIVE · DEMO ANALYSIS" : config.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/methodology#data-modes"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.12em] transition-opacity hover:opacity-85",
            config.className,
            className,
          )}
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-40" />
            <span className="relative inline-flex size-1.5 rounded-full bg-current" />
          </span>
          <Icon className="size-3" />
          {label}
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        {mode?.fallback_reason || data?.llm.note || "Bundled observations are synthetic demonstration data."}
        <span className="mt-1 block text-muted">Open the methodology page for data modes.</span>
      </TooltipContent>
    </Tooltip>
  );
}