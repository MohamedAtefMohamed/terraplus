import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExplorer } from "@/components/map/map-explorer";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Earth Explorer",
  description:
    "Interactive geospatial workspace: live NISAR footprints, acquisition timeline, change overlays, and catalogue inspection.",
};

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-3.75rem)] items-center justify-center bg-background">
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