"use client";

import { Compass } from "lucide-react";
import { useTour } from "@/components/tour/guided-tour";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TourButton({
  label = "Play the tour",
  variant = "primary",
  size = "lg",
  className,
}: {
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tour = useTour();
  return (
    <button
      type="button"
      onClick={() => tour.open(true)}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      <Compass className="size-4" />
      {label}
    </button>
  );
}
