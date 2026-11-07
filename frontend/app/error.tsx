"use client";

import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-20">
      <div className="panel max-w-lg p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md border border-danger/30 bg-danger/10">
          <AlertOctagon className="size-5 text-danger" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Something interrupted the console</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {error.message || "An unexpected rendering error occurred."} The API may be starting up
          or unreachable. Retry the view.
        </p>
        <Button onClick={reset} className="mt-6">
          <RotateCcw className="size-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}