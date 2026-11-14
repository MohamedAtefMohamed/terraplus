"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Compass, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { useTour } from "@/components/tour/guided-tour";

const NAV = [
  { href: "/live", label: "Live lab" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/map", label: "Map explorer" },
  { href: "/analysis", label: "Change analysis" },
  { href: "/timeline", label: "Timeline" },
  { href: "/insights", label: "Interpretation" },
  { href: "/methodology", label: "Methodology" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tour = useTour();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-gradient-to-r from-accent/0 via-accent to-accent/0 shadow-[0_0_18px_rgba(77,227,247,0.7)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => tour.open(true)}
            className="hidden items-center gap-1.5 rounded-full border border-line-strong bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-muted-strong transition-colors hover:border-accent/40 hover:text-foreground sm:inline-flex"
          >
            <Compass className="size-3.5 text-accent" />
            Take the tour
          </button>
          <Link
            href="/live"
            className={cn(buttonVariants({ size: "sm" }), "hidden md:inline-flex")}
          >
            Open live lab
            <ArrowUpRight className="size-3.5" />
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-muted-strong lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-line bg-background/95 lg:hidden"
          >
            <nav className="container-page grid gap-1 py-4" aria-label="Mobile navigation">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2.5 text-sm",
                      active ? "bg-surface-high text-foreground" : "text-muted hover:bg-surface hover:text-foreground",
                    )}
                  >
                    {item.label}
                    <ArrowUpRight className="size-3.5 opacity-50" />
                  </Link>
                );
              })}
              <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    tour.open(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-strong"
                >
                  <Compass className="size-3.5 text-accent" /> Take the tour
                </button>
                <Link
                  href="/live"
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Open live lab
                </Link>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}