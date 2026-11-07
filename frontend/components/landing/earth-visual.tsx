"use client";

import { motion } from "framer-motion";
import { Radar, Satellite, Waves } from "lucide-react";

export function EarthVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px] select-none">
      <div className="absolute inset-[14%] rounded-full bg-accent/10 blur-[80px]" />
      <div className="absolute inset-[28%] rounded-full bg-teal/10 blur-[60px]" />

      <div className="absolute inset-[2%] rounded-full border border-line/50" />
      <div className="absolute inset-[8%] rounded-full border border-dashed border-line/40 animate-orbit [animation-duration:80s]" />
      <div className="absolute inset-[14%] rounded-full border border-line/30" />

      <div className="absolute inset-[14%] rounded-full border border-accent/10">
        <div className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_2px_rgba(34,211,238,0.7)]" />
      </div>

      <motion.div
        className="absolute inset-[9%]"
        animate={{ rotate: 360 }}
        transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal/70 bg-background shadow-[0_0_18px_3px_rgba(45,212,191,0.35)]">
          <div className="absolute inset-[3px] rounded-full bg-teal" />
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-[18%] overflow-hidden rounded-full border border-accent/20 shadow-[inset_0_0_80px_rgba(4,12,22,0.9),0_0_90px_-20px_rgba(34,211,238,0.35)]"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <radialGradient id="ocean" cx="34%" cy="26%" r="82%">
              <stop offset="0%" stopColor="#0d3a52" />
              <stop offset="42%" stopColor="#082233" />
              <stop offset="100%" stopColor="#030b14" />
            </radialGradient>
            <radialGradient id="limb" cx="32%" cy="28%" r="78%">
              <stop offset="55%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.24" />
            </radialGradient>
            <linearGradient id="sweep" x1="200" y1="200" x2="380" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" stopOpacity="0.34" />
              <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="landFill" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#2dd4bf" stopOpacity="0.3" />
              <stop offset="1" stopColor="#34d399" stopOpacity="0.08" />
            </linearGradient>
            <clipPath id="globeClip">
              <circle cx="200" cy="200" r="185" />
            </clipPath>
          </defs>

          <circle cx="200" cy="200" r="185" fill="url(#ocean)" />

          <g clipPath="url(#globeClip)">
            <g stroke="#38bdf8" strokeOpacity="0.16" strokeWidth="1">
              {[-120, -75, -25, 25, 75, 120].map((offset) => (
                <ellipse
                  key={`lat-${offset}`}
                  cx="200"
                  cy={200 + offset}
                  rx={Math.sqrt(185 * 185 - offset * offset)}
                  ry={Math.max(10, Math.sqrt(185 * 185 - offset * offset) * 0.17)}
                />
              ))}
              {[28, 70, 112, 152, 182].map((rx) => (
                <ellipse key={`lon-${rx}`} cx="200" cy="200" rx={rx} ry="182" />
              ))}
            </g>

            <path
              d="M84 156c22-30 52-46 76-40 18 5 20 22 42 28 24 7 38-6 58 6 16 10 10 30-8 40-26 15-58 6-78 22-17 14-12 40-34 44-20 4-38-16-42-38-4-22-18-40-14-62Z"
              fill="url(#landFill)"
              stroke="#34d399"
              strokeOpacity="0.28"
            />
            <path
              d="M250 244c18-10 44-4 54 12 10 17 2 38-14 48-18 11-42 2-50-16-8-19-6-34 10-44Z"
              fill="url(#landFill)"
              stroke="#34d399"
              strokeOpacity="0.22"
            />
            <path
              d="M110 272c12-12 34-10 42 4 8 15 0 34-16 38-18 5-34-8-34-24 0-7 3-13 8-18Z"
              fill="url(#landFill)"
              stroke="#34d399"
              strokeOpacity="0.16"
            />

            <g fill="#7dd3fc" fillOpacity="0.55">
              {[
                [142, 180],
                [170, 205],
                [215, 165],
                [258, 208],
                [300, 240],
                [188, 260],
                [132, 236],
                [240, 285],
              ].map(([cx, cy], index) => (
                <circle key={`pt-${index}`} cx={cx} cy={cy} r={index % 3 === 0 ? 1.8 : 1.1} />
              ))}
            </g>

            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "200px 200px" }}
            >
              <path d="M200 200 L372 118 A185 185 0 0 1 352 246 Z" fill="url(#sweep)" />
              <line x1="200" y1="200" x2="372" y2="118" stroke="#67e8f9" strokeOpacity="0.5" strokeWidth="1" />
            </motion.g>

            <rect x="0" y="0" width="400" height="400" fill="url(#limb)" />
          </g>
          <circle cx="200" cy="200" r="185" fill="none" stroke="#22d3ee" strokeOpacity="0.22" />
        </svg>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_75%,rgba(2,6,12,0.55),transparent_55%)]" />

        <div className="absolute left-[19%] top-[36%] flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald" />
          </span>
          <span className="font-mono text-[10px] tracking-[0.16em] text-emerald/80">AOI 01</span>
        </div>
        <div className="absolute right-[22%] top-[57%] flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="font-mono text-[10px] tracking-[0.16em] text-accent/80">AOI 02</span>
        </div>
        <div className="absolute left-[34%] top-[68%] flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-teal" />
          <span className="font-mono text-[10px] tracking-[0.16em] text-teal/80">AOI 03</span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-px animate-scan-line bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="absolute left-0 top-[22%] hidden w-[168px] rounded-md border border-line bg-[#08101c]/90 p-3 backdrop-blur-md sm:block"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Mission context</span>
          <Satellite className="size-3 text-accent" />
        </div>
        <p className="mt-2 text-[11px] font-medium text-foreground">NISAR reference</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          L-band & S-band SAR · dual-agency mission
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="absolute right-0 top-[53%] hidden w-[176px] rounded-md border border-line bg-[#08101c]/90 p-3 backdrop-blur-md sm:block"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Change signal</span>
          <Radar className="size-3 text-teal" />
        </div>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-[11px] font-medium text-foreground">Backscatter Δ</p>
          <p className="font-mono text-[13px] text-teal">−3.3 dB</p>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-teal to-accent" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        className="absolute bottom-[3%] left-[6%] flex items-center gap-2 rounded-full border border-line bg-[#08101c]/90 px-3 py-1.5 backdrop-blur-md"
      >
        <Waves className="size-3 text-accent" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Water indicator · demo
        </span>
        <span className="size-1 rounded-full bg-amber" />
      </motion.div>

      <div className="absolute bottom-[1%] right-[1%] font-mono text-[10px] uppercase tracking-[0.2em] text-muted/60">
        Synthetic visualisation
      </div>
    </div>
  );
}