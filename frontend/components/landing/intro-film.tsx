"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export function IntroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      videoRef.current?.pause();
      setPaused(true);
    }
    const onVisibility = () => {
      if (document.hidden) videoRef.current?.pause();
      else if (!paused) void videoRef.current?.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [paused]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
      <video
        ref={videoRef}
        className="size-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/media/intro-poster.jpg"
        aria-label="TerraPulse introduction: NISAR catalogue, Sentinel-1 comparison, and change measurement"
      >
        <source src="/media/intro.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_20%_40%,rgba(4,7,11,0.9),rgba(4,7,11,0.35)_60%,transparent)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="absolute bottom-5 right-5 z-10 flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 backdrop-blur sm:inline-flex">
          <VolumeX className="size-3" /> Silent film · 20 s
        </span>
        <button
          type="button"
          onClick={toggle}
          className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur transition-colors hover:border-accent/50 hover:text-white"
          aria-label={paused ? "Play introduction film" : "Pause introduction film"}
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
      </div>
    </div>
  );
}
