"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Compass,
  Pause,
  Play,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type Step = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  href: string;
  cta: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    eyebrow: "Start here",
    title: "Radar surface change, measured",
    body: "TerraPulse reads the NISAR catalogue from NASA's ASF archive and compares real Sentinel-1 scenes. This tour covers the four screens you will use.",
    image: "/media/tour-title.jpg",
    href: "/live",
    cta: "Open the live lab",
  },
  {
    id: "catalogue",
    eyebrow: "Catalogue",
    title: "Real NISAR records, no login",
    body: "Granule records arrive with orbit direction, track, frame, product level, and the official browse quick-look. Footprints render on the map.",
    image: "/media/tour-nisar.jpg",
    href: "/map",
    cta: "Open the map",
  },
  {
    id: "compare",
    eyebrow: "Comparison",
    title: "Two passes, one measurement",
    body: "Pick an area and a window. The engine pairs scenes on the same relative orbit near the 12-day repeat, then reads only the overlap window from both cloud-optimized scenes.",
    image: "/media/tour-wipe.jpg",
    href: "/live",
    cta: "Run a comparison",
  },
  {
    id: "change",
    eyebrow: "Change map",
    title: "See where the radar moved",
    body: "A 3×3 median screen, an Otsu water split, and a configurable dB threshold produce a change overlay, coverage stats, and vectorized patches.",
    image: "/media/tour-change.jpg",
    href: "/live",
    cta: "Open the change lab",
  },
  {
    id: "timeline",
    eyebrow: "Timeline",
    title: "Track every pass",
    body: "The timeline lists Sentinel-1 acquisitions and NISAR catalogue records for an area, with pass counts per month and the latest cached comparison.",
    image: "/media/tour-timeline.jpg",
    href: "/timeline",
    cta: "Open the timeline",
  },
  {
    id: "interpretation",
    eyebrow: "Interpretation",
    title: "Read what the data supports",
    body: "A deterministic explanation states the measurements, plausible drivers, method, confidence, and the claims the comparison cannot support.",
    image: "/media/tour-insights.jpg",
    href: "/insights",
    cta: "Open interpretation",
  },
];

type TourContextValue = {
  open: (autoplay?: boolean) => void;
  close: () => void;
  isOpen: boolean;
};

const TourContext = createContext<TourContextValue | null>(null);

const AUTOPLAY_MS = 7200;

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const open = useCallback((autoplay = true) => {
    setIndex(0);
    setProgress(0);
    setPlaying(autoplay);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPlaying(false);
  }, []);

  const next = useCallback(() => {
    setIndex((current) => {
      if (current >= STEPS.length - 1) {
        setIsOpen(false);
        setPlaying(false);
        return 0;
      }
      return current + 1;
    });
    setProgress(0);
  }, []);

  const prev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close, next, prev]);

  useEffect(() => {
    if (!isOpen || !playing) return;
    const started = performance.now();
    const stepMs = 60;
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - started;
      setProgress(Math.min(1, elapsed / AUTOPLAY_MS));
      if (elapsed >= AUTOPLAY_MS) {
        next();
      }
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [isOpen, playing, index, next]);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);
  const step = STEPS[index];

  return (
    <TourContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close tour"
              onClick={close}
              className="absolute inset-0 cursor-default bg-[#030508]/85 backdrop-blur-md"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="TerraPulse guided tour"
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="panel relative z-10 w-full max-w-5xl overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
                <div className="relative min-h-[220px] overflow-hidden border-b border-line md:border-b-0 md:border-r">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={step.image}
                      src={step.image}
                      alt=""
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-0 size-full object-cover"
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070708]/70 via-transparent to-[#070708]/20" />
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80 backdrop-blur">
                    <Compass className="size-3" />
                    Guided tour
                  </div>
                </div>

                <div className="flex flex-col p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                        {step.eyebrow}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-foreground sm:text-2xl">
                        {step.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close tour"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-muted-strong">{step.body}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={step.href}
                      onClick={close}
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      {step.cta}
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPlaying((value) => !value)}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                    >
                      {playing ? (
                        <>
                          <Pause className="size-3.5" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="size-3.5" /> Autoplay
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-auto pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        {STEPS.map((item, itemIndex) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-label={`Go to step ${itemIndex + 1}`}
                            onClick={() => {
                              setIndex(itemIndex);
                              setProgress(0);
                            }}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              itemIndex === index
                                ? "w-6 bg-accent"
                                : itemIndex < index
                                  ? "w-1.5 bg-accent/50"
                                  : "w-1.5 bg-line-strong",
                            )}
                          />
                        ))}
                      </div>
                      <p className="font-mono text-[10px] text-muted">
                        {index + 1} / {STEPS.length}
                      </p>
                    </div>
                    {playing ? (
                      <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full bg-accent transition-[width] duration-75"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={prev}
                        disabled={index === 0}
                        className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
                      >
                        <ArrowLeft className="size-3.5" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={next}
                        className={cn(buttonVariants({ size: "sm" }))}
                      >
                        {index === STEPS.length - 1 ? "Finish" : "Next"}
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-muted/70">
                      Arrow keys to move · Esc to close
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used inside TourProvider");
  }
  return context;
}