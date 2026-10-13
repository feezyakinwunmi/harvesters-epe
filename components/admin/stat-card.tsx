import { cn } from "@/lib/utils";

export function StatCard({ label, value, detail, emphasis = false }: { label: string; value: React.ReactNode; detail?: React.ReactNode; emphasis?: boolean }) {
  return (
    <div
      className={cn(
        "hc-rise hc-lift relative isolate overflow-hidden rounded-md border px-4 py-4 sm:px-5",
        emphasis ? "border-night-line bg-night text-white" : "border-line bg-surface shadow-soft",
      )}
    >
      {emphasis ? (
        <>
          <div className="hc-dots absolute inset-0 -z-10 opacity-40" aria-hidden />
          <div aria-hidden className="absolute -right-16 -top-16 -z-10 size-48 rounded-full" style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.4), transparent 65%)" }} />
        </>
      ) : (
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent/70 via-accent/20 to-transparent" />
      )}
      <p className={cn("text-[13px] font-semibold", emphasis ? "text-gold-light" : "text-muted")}>{label}</p>
      <p className={cn("mt-2 text-[1.75rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums sm:text-[2rem]", emphasis ? "text-white" : "text-ink")}>{value}</p>
      {detail ? <p className={cn("mt-2 text-xs", emphasis ? "text-white/60" : "text-muted")}>{detail}</p> : null}
    </div>
  );
}
