import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-20">
      <div className="panel max-w-lg p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md border border-accent/25 bg-accent/10">
          <Compass className="size-5 text-accent" />
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="mt-2 text-xl font-semibold">No observation at these coordinates</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The page you requested is outside the TerraPulse demo footprint.
        </p>
        <Link href="/dashboard" className={cn(buttonVariants(), "mt-6")}>
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}