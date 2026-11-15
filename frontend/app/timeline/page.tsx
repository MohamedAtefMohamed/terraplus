import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveTimeline } from "@/components/timeline/live-timeline";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Acquisition timeline",
  description:
    "Sentinel-1 passes and NISAR catalogue records for a monitoring area over the last 180 days.",
};

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="container-page space-y-4 py-10">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      }
    >
      <LiveTimeline />
    </Suspense>
  );
}
