import type { Metadata } from "next";
import { Suspense } from "react";
import { InsightsView } from "@/components/insights/insights-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "AI insights",
  description:
    "Read a careful, source-linked explanation of a change analysis that separates measured observations from interpretation and states uncertainty.",
};

export default function InsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page space-y-4 py-10">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
            <Skeleton className="h-[480px] rounded-lg" />
            <Skeleton className="h-[480px] rounded-lg" />
          </div>
        </div>
      }
    >
      <InsightsView />
    </Suspense>
  );
}