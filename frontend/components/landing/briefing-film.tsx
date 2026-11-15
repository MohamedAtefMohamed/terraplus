"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export function BriefingFilm({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const shell = shellRef.current;
    const video = videoRef.current;
    if (!shell || !video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !reduced) {
            void video.play().catch(() => {});
            setPlaying(true);
          } else {
            video.pause();
            setPlaying(false);
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(shell);
    return () => observer.disconnect();
  }, [loaded]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div ref={shellRef} className={cn("panel bracket overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <p className="tech-label">Mission briefing · 20 s</p>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <VolumeX className="size-3" /> silent
          </span>
          <span>Atchafalaya Basin · 14 → 26 Oct 2026</span>
        </div>
      </div>
      <div className="relative aspect-video bg-[#070708]">
        <video
          ref={videoRef}
          className="size-full object-cover"
          src="/media/intro.mp4"
          poster="/media/intro-poster.jpg"
          muted
          loop
          playsInline
          preload="none"
          onLoadedData={() => setLoaded(true)}
          aria-label="Briefing film: NISAR catalogue, Sentinel-1 comparison, and measured change"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070708]/70 via-transparent to-transparent" />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause briefing film" : "Play briefing film"}
          className="absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/85 backdrop-blur transition-colors hover:border-accent/60 hover:text-white"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <div className="pointer-events-none absolute bottom-3 left-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
            NISAR browse · Sentinel-1 GRD · NASA GIBS
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
        <p className="text-[11px] text-muted">
          Assembled from the same live imagery the explorer reads. No simulated radar.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted/80">
          plays when in view
        </p>
      </div>
    </div>
  );
}