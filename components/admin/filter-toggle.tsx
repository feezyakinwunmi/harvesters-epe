"use client";
import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/** On phones, extra filters fold away behind a button; from md they're always shown. */
export function FilterToggle({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(activeCount > 0);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 text-sm font-semibold text-ink md:hidden"
      >
        <SlidersHorizontal className="size-4 text-accent" aria-hidden />
        Filters
        {activeCount ? <span className="flex size-5 items-center justify-center rounded-full bg-ink text-[11px] text-gold-light">{activeCount}</span> : null}
        <ChevronDown className={cn("size-4 text-muted transition-transform duration-300", open && "rotate-180")} aria-hidden />
      </button>
      <div className={cn("w-full grid-cols-2 gap-3 md:contents", open ? "hc-step-in grid" : "hidden")}>{children}</div>
    </>
  );
}
