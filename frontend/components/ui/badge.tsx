import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] transition-colors",
  {
    variants: {
      variant: {
        accent: "border-white/14 bg-white/[0.05] text-foreground",
        teal: "border-emerald/30 bg-emerald/10 text-emerald",
        emerald: "border-emerald/30 bg-emerald/10 text-emerald",
        amber: "border-amber/30 bg-amber/10 text-amber",
        danger: "border-danger/30 bg-danger/10 text-danger",
        outline: "border-white/10 bg-transparent text-muted-strong",
        muted: "border-white/[0.08] bg-white/[0.02] text-muted",
        violet: "border-violet/30 bg-violet/10 text-violet",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}