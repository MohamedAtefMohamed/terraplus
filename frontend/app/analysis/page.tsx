import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalysisWorkspace } from "@/components/analysis/analysis-workspace";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Change analysis",
  description:
    "Select two SAR observations, run an explainable change comparison, and inspect derived overlays, statistics, quality and limitations.",
};

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page space-y-4 py-10">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
            <Skeleton className="h-[480px] rounded-lg" />
            <Skeleton className="h-[480px] rounded-lg" />
          </div>
        </div>
      }
    >
      <AnalysisWorkspace />
    </Suspense>
  );
}
