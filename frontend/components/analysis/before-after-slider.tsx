"use client";

import { useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { assetUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeDate,
  afterDate,
  isSynthetic = true,
}: {
  beforeUrl: string | null;
  afterUrl: string | null;
  beforeDate: string;
  afterDate: string;
  isSynthetic?: boolean;
}) {
  const [position, setPosition] = useState(52);

  return (
    <div className="overflow-hidden rounded-md border border-line bg-background">
      <div className="relative aspect-[16/9] select-none">
        <img
          src={assetUrl(afterUrl) || ""}
          alt={`Later demonstration scene, ${afterDate}`}
          className="absolute inset-0 size-full object-cover"
          draggable={false}
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={assetUrl(beforeUrl) || ""}
            alt={`Earlier demonstration scene, ${beforeDate}`}
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
        </div>

        <div className="pointer-events-none absolute inset-y-0 w-px bg-accent/90" style={{ left: `${position}%` }}>
          <div className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent/50 bg-[#07101c]/90 shadow-lg">
            <MoveHorizontal className="size-3.5 text-accent" />
          </div>
        </div>

        <div className="pointer-events-none absolute left-2 top-2 rounded bg-[#07101c]/85 px-2 py-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Earlier</p>
          <p className="text-[10px] font-medium text-foreground">{formatDate(beforeDate)}</p>
        </div>
        <div className="pointer-events-none absolute right-2 top-2 rounded bg-[#07101c]/85 px-2 py-1 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Later</p>
          <p className="text-[10px] font-medium text-foreground">{formatDate(afterDate)}</p>
        </div>
        <div
          className={`pointer-events-none absolute bottom-2 left-2 rounded px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
            isSynthetic ? "bg-amber/10 text-amber" : "bg-emerald/10 text-emerald"
          }`}
        >
          {isSynthetic ? "Synthetic demo backscatter" : "Staged sample scene · attributed"}
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label="Drag to compare earlier and later scenes"
          className="absolute inset-0 size-full cursor-ew-resize opacity-0"
        />
      </div>
      <div className="flex items-center justify-between border-t border-line px-3 py-2">
        <p className="text-[10px] text-muted">Drag across the scene to compare surface brightness.</p>
        <p className="font-mono text-[10px] text-accent">{Math.round(position)}% earlier</p>
      </div>
    </div>
  );
}