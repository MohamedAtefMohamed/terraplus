import type { ReactNode } from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  info: {
    icon: Info,
    className: "border-accent/20 bg-accent/[0.055] text-muted-strong",
    iconClass: "text-accent",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber/25 bg-amber/[0.06] text-muted-strong",
    iconClass: "text-amber",
  },
  danger: {
    icon: ShieldAlert,
    className: "border-danger/25 bg-danger/[0.06] text-muted-strong",
    iconClass: "text-danger",
  },
} as const;

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof variants;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const config = variants[tone];
  const Icon = config.icon;
  return (
    <div className={cn("flex gap-3 rounded-md border p-3.5", config.className, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", config.iconClass)} />
      <div className="space-y-1 text-xs leading-relaxed">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}