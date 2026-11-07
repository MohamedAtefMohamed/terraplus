import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("size-9", className)}
    >
      <defs>
        <linearGradient id="tp-mark" x1="8" y1="6" x2="33" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67E8F9" />
          <stop offset="0.55" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#2DD4BF" />
        </linearGradient>
        <linearGradient id="tp-fill" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0D1A2B" />
          <stop offset="1" stopColor="#070D17" />
        </linearGradient>
      </defs>
      <rect x="1.25" y="1.25" width="37.5" height="37.5" rx="11" fill="url(#tp-fill)" stroke="#1E3550" />
      <circle cx="20" cy="20" r="8.4" stroke="url(#tp-mark)" strokeWidth="1.35" />
      <ellipse
        cx="20"
        cy="20"
        rx="14.2"
        ry="5.1"
        transform="rotate(-24 20 20)"
        stroke="#22D3EE"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <path d="M20 11.6v16.8M11.9 20h16.2" stroke="#2DD4BF" strokeOpacity="0.28" strokeWidth="0.8" />
      <path
        d="M20 12.7v14.6M13.3 16.1c3.9 2.7 9.5 2.7 13.4 0M13.3 23.9c3.9-2.7 9.5-2.7 13.4 0"
        stroke="url(#tp-mark)"
        strokeOpacity="0.35"
        strokeWidth="0.85"
      />
      <circle cx="30.2" cy="13.2" r="2.3" fill="#050A12" stroke="#67E8F9" strokeWidth="1" />
      <circle cx="30.2" cy="13.2" r="0.9" fill="#22D3EE" />
      <path d="M26.4 25.4h2.3l1.4-3.2 1.8 6 1.3-2.8h2.1" stroke="#2DD4BF" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="TerraPulse home">
      <LogoMark className="size-9 transition-transform duration-300 group-hover:scale-[1.04]" />
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-[1.0625rem] font-semibold tracking-[-0.035em] text-foreground">
            Terra<span className="text-accent">Pulse</span>
          </span>
          <span className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted">
            Surface intelligence
          </span>
        </span>
      ) : null}
    </Link>
  );
}