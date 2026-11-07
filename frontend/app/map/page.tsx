import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExplorer } from "@/components/map/map-explorer";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Map explorer",
  description:
    "Explore demonstration monitoring footprints, filter observation dates, toggle change layers and query live NISAR granule metadata.",
};

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
          <div className="w-full max-w-5xl space-y-4 px-6">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-[60vh] w-full rounded-lg" />
          </div>
        </div>
      }
    >
      <MapExplorer />
    </Suspense>
  );
}