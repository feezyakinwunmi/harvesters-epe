import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { SunRays, WheatField } from "@/components/site/art";

/** Stagger helper for the .hc-rise entrance animation. */
export const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * Dark band at the top of content pages: gold eyebrow, title, intro,
 * slow-turning rays and a few stalks of wheat.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  icon,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden bg-night text-white", className)}>
      <div className="hc-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
      <div
        aria-hidden
        className="hc-glow absolute -right-32 -top-48 -z-10 size-[560px] rounded-full"
        style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.3), transparent 62%)" }}
      />
      <SunRays className="absolute -right-48 -top-56 -z-10 size-[620px] opacity-70" />
      <WheatField className="absolute -bottom-10 right-4 -z-10 hidden h-56 opacity-70 sm:block" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden />
      <div className="mx-auto max-w-6xl px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="hc-rise inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold-light [&_svg]:size-3.5">
              {icon}
              {eyebrow}
            </p>
          ) : null}
          <h1 className="hc-rise mt-5 text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-[3.25rem]" style={delay(80)}>
            {title}
          </h1>
          {description ? (
            <p className="hc-rise mt-4 max-w-xl text-lg leading-relaxed text-white/65" style={delay(160)}>
              {description}
            </p>
          ) : null}
          {children ? <div className="hc-rise mt-8" style={delay(240)}>{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

/** Small uppercase gold label above section headings. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent", className)}>
      <span aria-hidden className="h-px w-6 bg-accent/60" />
      {children}
    </p>
  );
}
