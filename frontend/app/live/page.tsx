import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveLab } from "@/components/live/live-lab";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Live SAR change lab",
  description:
    "Run a change comparison on real Sentinel-1 scenes and browse the live NISAR granule catalogue from the ASF DAAC.",
};

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className="container-page space-y-4 py-10">
          <Skeleton className="h-8 w-72" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
            <Skeleton className="h-[420px] rounded-lg" />
            <Skeleton className="h-[420px] rounded-lg" />
          </div>
        </div>
      }
    >
      <LiveLab />
    </Suspense>
  );
}
