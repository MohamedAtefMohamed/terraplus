"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, MoveHorizontal, RotateCcw } from "lucide-react";
import { assetUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeDate,
  afterDate,
  isSynthetic = false,
  beforeLabel = "Earlier",
  afterLabel = "Later",
  mission = "Sentinel-1 GRD · VV",
}: {
  beforeUrl: string | null;
  afterUrl: string | null;
  beforeDate: string;
  afterDate: string;
  isSynthetic?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
  mission?: string;
}) {
  const [position, setPosition] = useState(50);
  const [zoomed, setZoomed] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 10 : 2;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPosition((value) => Math.max(0, value - step));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setPosition((value) => Math.min(100, value + step));
    }
    if (event.key === "Home") setPosition(0);
    if (event.key === "End") setPosition(100);
  }, []);

  useEffect(() => {
    const reset = () => setPosition(50);
    window.addEventListener("blur", reset);
    return () => window.removeEventListener("blur", reset);
  }, []);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <MoveHorizontal className="size-3.5 text-accent" />
          <p className="tech-label">Comparison viewport</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {mission}
          </span>
          <button
            type="button"
            onClick={() => setZoomed((value) => !value)}
            aria-pressed={zoomed}
            className={cn(
              "inline-flex items-center gap-1 rounded border px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
              zoomed
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-line text-muted hover:text-foreground",
            )}
          >
            <Maximize2 className="size-3" /> {zoomed ? "1.6×" : "fit"}
          </button>
          <button
            type="button"
            onClick={() => setPosition(50)}
            className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3" /> reset
          </button>
        </div>
      </div>

      <div
        ref={frameRef}
        className="relative aspect-[16/9] select-none overflow-hidden bg-[#070708]"
      >
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{ transform: zoomed ? "scale(1.6)" : "scale(1)" }}
        >
          { }
          <img
            src={assetUrl(afterUrl) || ""}
            alt={`Later radar scene, ${afterDate}`}
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          >
            { }
            <img
              src={assetUrl(beforeUrl) || ""}
              alt={`Earlier radar scene, ${beforeDate}`}
              className="absolute inset-0 size-full object-cover"
              draggable={false}
            />
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-accent shadow-[0_0_18px_rgba(25,200,232,0.7)]"
          style={{ left: `${position}%` }}
        >
          <div className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent/60 bg-[#111114]/90">
            <MoveHorizontal className="size-3.5 text-accent" />
          </div>
        </div>

        <div className="pointer-events-none absolute left-2 top-2 rounded border border-white/10 bg-black/55 px-2 py-1 backdrop-blur">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/60">
            {beforeLabel}
          </p>
          <p className="font-mono text-[10px] text-white/90">{formatDate(beforeDate)}</p>
        </div>
        <div className="pointer-events-none absolute right-2 top-2 rounded border border-white/10 bg-black/55 px-2 py-1 text-right backdrop-blur">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/60">
            {afterLabel}
          </p>
          <p className="font-mono text-[10px] text-white/90">{formatDate(afterDate)}</p>
        </div>
        <div
          className={cn(
            "pointer-events-none absolute bottom-2 left-2 rounded px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]",
            isSynthetic ? "bg-amber/15 text-amber" : "bg-emerald/15 text-emerald",
          )}
        >
          {isSynthetic ? "synthetic scene" : "live scene"}
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          onKeyDown={onKeyDown}
          aria-label="Drag to compare earlier and later scenes"
          className="absolute inset-0 size-full cursor-ew-resize appearance-none bg-transparent opacity-0"
        />
      </div>

      <div className="flex items-center justify-between border-t border-line px-3 py-2">
        <p className="text-[10px] text-muted">
          Drag, or focus the handle and use ← → (Shift for larger steps).
        </p>
        <p className="font-mono text-[10px] text-accent">{Math.round(position)}% earlier</p>
      </div>
    </div>
  );
}