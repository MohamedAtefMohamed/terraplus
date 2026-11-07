import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  accent: "text-accent border-accent/20 bg-accent/[0.06]",
  teal: "text-teal border-teal/20 bg-teal/[0.06]",
  emerald: "text-emerald border-emerald/20 bg-emerald/[0.06]",
  amber: "text-amber border-amber/20 bg-amber/[0.06]",
  violet: "text-violet border-violet/20 bg-violet/[0.06]",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  tone = "accent",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div className={cn("panel relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
        <div className={cn("flex size-8 items-center justify-center rounded-md border", tones[tone])}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[1.75rem] font-semibold leading-none metric-value text-foreground">
          {value}
        </span>
        {unit ? <span className="text-xs text-muted">{unit}</span> : null}
      </div>
      {hint ? <p className="mt-2 text-[11px] leading-snug text-muted">{hint}</p> : null}
      <div className="pointer-events-none absolute -bottom-8 -right-6 size-24 rounded-full border border-line/40" />
    </div>
  );
}