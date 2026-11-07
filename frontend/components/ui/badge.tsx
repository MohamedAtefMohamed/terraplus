import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        accent: "border-accent/30 bg-accent/10 text-accent-soft",
        teal: "border-teal/30 bg-teal/10 text-teal",
        emerald: "border-emerald/30 bg-emerald/10 text-emerald",
        amber: "border-amber/30 bg-amber/10 text-amber",
        danger: "border-danger/30 bg-danger/10 text-danger",
        outline: "border-line-strong bg-transparent text-muted-strong",
        muted: "border-line bg-white/[0.03] text-muted",
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