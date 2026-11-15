"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Compass, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { useTour } from "@/components/tour/guided-tour";

const NAV = [
  { href: "/map", label: "Earth Explorer" },
  { href: "/areas", label: "Areas" },
  { href: "/live", label: "Change Analysis" },
  { href: "/timeline", label: "Timeline" },
  { href: "/insights", label: "Interpretation" },
  { href: "/missions", label: "Data & Missions" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const tour = useTour();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-white/[0.06] bg-[#070708]/88 backdrop-blur-2xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-15 items-center justify-between gap-4 py-2.5">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main navigation">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-md px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                    active ? "text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute inset-x-2.5 -bottom-px h-px bg-accent-soft shadow-[0_0_12px_rgba(155,230,245,0.55)]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => tour.open(true)}
            className="hidden size-9 items-center justify-center rounded-md border border-line-strong bg-white/[0.03] text-muted-strong transition-colors hover:border-accent/40 hover:text-foreground lg:inline-flex"
            aria-label="Take the guided tour"
            title="Take the guided tour"
          >
            <Compass className="size-4 text-accent" />
          </button>
          <Link
            href="/map"
            className={cn(buttonVariants({ size: "sm" }), "hidden md:inline-flex")}
          >
            Launch Earth Explorer
            <ArrowUpRight className="size-3.5" />
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-muted-strong xl:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-background/95 backdrop-blur-2xl xl:hidden"
          >
            <div className="container-page flex flex-col gap-0.5 py-3">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em]",
                      active ? "bg-accent/[0.08] text-foreground" : "text-muted",
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
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-strong"
                >
                  <Compass className="size-3.5 text-accent" /> Guided tour
                </button>
                <Link href="/map" className={cn(buttonVariants({ size: "sm" }))}>
                  Launch explorer
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}