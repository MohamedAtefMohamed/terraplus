import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  accent: "text-accent border-accent/25 bg-accent/[0.07]",
  teal: "text-teal border-teal/25 bg-teal/[0.07]",
  emerald: "text-emerald border-emerald/25 bg-emerald/[0.07]",
  amber: "text-amber border-amber/25 bg-amber/[0.07]",
  violet: "text-violet border-violet/25 bg-violet/[0.07]",
} as const;

const bars = {
  accent: "rgba(25,200,232,",
  teal: "rgba(45,212,191,",
  emerald: "rgba(47,207,155,",
  amber: "rgba(242,166,90,",
  violet: "rgba(139,125,255,",
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
        <p className="tech-label leading-tight">{label}</p>
        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md border", tones[tone])}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="mt-3.5 flex items-baseline gap-1.5">
        <span className="metric-value text-[1.75rem] font-semibold leading-none text-foreground">
          {value}
        </span>
        {unit ? <span className="font-mono text-[11px] text-muted">{unit}</span> : null}
      </div>
      {hint ? <p className="mt-2 text-[11px] leading-snug text-muted">{hint}</p> : null}
      <div className="tick-row mt-3 h-4 opacity-70">
        {Array.from({ length: 22 }).map((_, index) => (
          <span
            key={index}
            style={{
              height: `${3 + ((index * 5) % 12)}px`,
              background: `${bars[tone]}${index % 3 === 0 ? 0.75 : 0.3})`,
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute -right-6 -top-10 size-24 rounded-full border border-line/30" />
    </div>
  );
}