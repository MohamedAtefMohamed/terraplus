import type { Metadata } from "next";
import { Suspense } from "react";
import { TimelineView } from "@/components/timeline/timeline-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Temporal analysis",
  description:
    "Follow a demonstration monitoring area through its observation record and inspect the evolution of the radar water indicator and change signals.",
};

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="container-page space-y-4 py-10">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-[340px] w-full rounded-lg" />
        </div>
      }
    >
      <TimelineView />
    </Suspense>
  );
}