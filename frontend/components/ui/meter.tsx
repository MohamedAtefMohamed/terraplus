import { cn } from "@/lib/utils";

const tones = {
  emerald: "from-emerald to-teal",
  amber: "from-amber to-orange",
  danger: "from-danger to-orange",
} as const;

export function Meter({
  value,
  tone = "emerald",
  className,
}: {
  value: number;
  tone?: keyof typeof tones;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", tones[tone])}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}