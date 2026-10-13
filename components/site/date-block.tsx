import { dateParts } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Calendar tile: gold month, large day, weekday. `tone="glass"` sits on images. */
export function DateBlock({ iso, tone = "light", className }: { iso: string | null; tone?: "light" | "dark" | "glass"; className?: string }) {
  if (!iso) return <div className="w-14 shrink-0" aria-hidden />;
  const p = dateParts(iso);
  return (
    <div
      aria-hidden
      className={cn(
        "flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-sm text-center",
        tone === "light" && "border border-line bg-surface shadow-soft",
        tone === "dark" && "border border-night-line bg-night-raised",
        tone === "glass" && "border border-white/15 bg-black/55 backdrop-blur-md",
        className,
      )}
    >
      <p className={cn("w-full py-1 text-[10px] font-bold uppercase tracking-[0.12em]", tone === "light" ? "bg-ink text-gold-light" : "bg-gold/15 text-gold-light")}>
        {p.month}
      </p>
      <p className={cn("pt-1.5 text-2xl font-extrabold leading-none tabular-nums", tone === "light" ? "text-ink" : "text-white")}>{p.day}</p>
      <p className={cn("pb-1.5 pt-0.5 text-[11px]", tone === "light" ? "text-muted" : "text-white/60")}>{p.weekday}</p>
    </div>
  );
}
