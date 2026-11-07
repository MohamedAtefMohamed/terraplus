"use client";

import dynamic from "next/dynamic";

export const DynamicMap = dynamic(
  () => import("@/components/map/map-canvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full min-h-[280px] items-center justify-center bg-[#050a12]">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          Loading map surface
        </div>
      </div>
    ),
  },
);
