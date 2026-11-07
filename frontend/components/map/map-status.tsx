export function MapStatusHint({ note }: { note?: string }) {
  return (
    <p className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-line bg-[#070e19]/90 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted backdrop-blur">
      {note || "Demo footprints · not real NISAR coverage"}
    </p>
  );
}
