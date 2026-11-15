import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border border-[#f4f4f4] bg-[#f4f4f4] text-[#070708] shadow-[0_16px_50px_-30px_rgba(255,255,255,0.55)] hover:border-white hover:bg-white",
        secondary:
          "border border-white/14 bg-[#111114] text-foreground hover:border-white/42 hover:bg-[#17171a]",
        outline:
          "border border-white/10 bg-transparent text-muted-strong hover:border-white/30 hover:bg-white/[0.03] hover:text-foreground",
        ghost: "text-muted-strong hover:bg-white/[0.04] hover:text-foreground",
        danger: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/18",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 px-4 [&_svg]:size-4",
        lg: "h-11 px-5 text-[0.9375rem] [&_svg]:size-4",
        icon: "h-9 w-9 [&_svg]:size-4",
        "icon-sm": "h-7 w-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";