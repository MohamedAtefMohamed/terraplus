"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ErrorPanel({
  title = "The API did not respond",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("panel flex flex-col items-center gap-3 p-10 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-md border border-danger/25 bg-danger/10">
        <ServerCrash className="size-5 text-danger" />
      </div>
      <div className="max-w-md space-y-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted">{message}</p>
        <p className="font-mono text-[10px] text-muted/70">
          Expected backend: {apiUrl("").replace(/\/$/, "") || "same origin"}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Retry request
        </Button>
      ) : null}
    </div>
  );
}