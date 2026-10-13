import { Ornament, SunRays, WheatField } from "@/components/site/art";
import { delay } from "@/components/site/page-hero";
import { cn } from "@/lib/utils";

/**
 * Split layout for sign-in and registration: a dark, illustrated panel
 * with reassurance on the left, the form on a clean card on the right.
 */
export function AuthShell({
  eyebrow,
  title,
  intro,
  points,
  footnote,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro: React.ReactNode;
  points: Array<{ icon: React.ReactNode; title: string; body: string }>;
  footnote?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-8 sm:py-10">
      <div className={cn("grid overflow-hidden rounded-lg border border-line bg-surface shadow-soft", wide ? "lg:grid-cols-[0.85fr_1.15fr]" : "lg:grid-cols-[1fr_1fr]")}>
        <aside className="relative isolate overflow-hidden bg-night px-7 py-10 text-white sm:px-10 lg:py-14">
          <div className="hc-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
          <div
            aria-hidden
            className="hc-glow absolute -left-32 -top-32 -z-10 size-[460px] rounded-full"
            style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.32), transparent 62%)" }}
          />
          <SunRays className="absolute -left-56 -top-56 -z-10 size-[560px] opacity-60" />
          <WheatField className="absolute -bottom-8 -right-6 -z-10 hidden h-56 opacity-60 lg:block" />

          <p className="hc-rise text-xs font-semibold uppercase tracking-[0.14em] text-gold-light">{eyebrow}</p>
          <h1 className="hc-rise mt-4 text-[2rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-white sm:text-[2.5rem]" style={delay(80)}>
            {title}
          </h1>
          <p className="hc-rise mt-4 max-w-md leading-relaxed text-white/65" style={delay(160)}>{intro}</p>

          <ul className="mt-9 hidden space-y-5 sm:block">
            {points.map((p, i) => (
              <li key={p.title} className="hc-rise flex gap-4" style={delay(240 + i * 90)}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-white/[0.04] text-gold-light [&_svg]:size-4.5">
                  {p.icon}
                </span>
                <div>
                  <p className="font-semibold text-white">{p.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/55">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <Ornament className="mt-10 hidden lg:inline-flex" />
        </aside>

        <div className="relative px-5 py-8 sm:px-10 sm:py-12">
          <div className="hc-rise mx-auto max-w-lg" style={delay(150)}>{children}</div>
          {footnote ? <div className="mx-auto mt-8 max-w-lg">{footnote}</div> : null}
        </div>
      </div>
    </div>
  );
}
