import { Check, ScanLine } from "lucide-react";
import { QrGlyph } from "@/components/site/art";

/**
 * Hero illustration: a phone scanning the entrance code, with the
 * confirmation floating beside it. Pure markup and CSS animation.
 */
export function PhoneScene() {
  return (
    <div className="relative mx-auto w-full max-w-[380px]" aria-hidden>
      {/* Phone */}
      <div className="hc-float relative mx-auto w-[250px] rounded-[38px] border border-white/10 bg-gradient-to-b from-[#1d1a14] to-[#0d0c0a] p-2.5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(176_141_62/0.25)]">
        <div className="relative overflow-hidden rounded-[30px] bg-[#f7f5f0]">
          <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-night" />
          <div className="px-5 pb-6 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold tracking-[-0.01em] text-ink">Harvesters <span className="font-medium text-accent">Epe</span></span>
              <ScanLine className="size-3.5 text-accent" />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Sunday service</p>
            <p className="mt-1 text-[17px] font-extrabold leading-tight tracking-[-0.02em] text-ink">Scan to check in</p>

            <div className="relative mx-auto mt-4 aspect-square w-full overflow-hidden rounded-xl bg-white p-4 shadow-soft">
              <QrGlyph className="size-full text-ink" />
              {/* Viewfinder corners */}
              {["left-2 top-2 border-l-2 border-t-2", "right-2 top-2 border-r-2 border-t-2", "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"].map((c) => (
                <span key={c} className={`absolute size-5 rounded-[4px] border-accent ${c}`} />
              ))}
              <span
                className="hc-scan absolute inset-x-3 top-3 h-0.5 rounded-full bg-accent shadow-[0_0_14px_3px_rgb(176_141_62/0.55)]"
                style={{ ["--scan" as string]: "160px" }}
              />
            </div>

            <div className="mt-4 h-9 rounded-lg bg-ink text-center text-[12px] font-semibold leading-9 text-white">Checking you in…</div>
          </div>
        </div>
      </div>

      {/* Confirmation card */}
      <div className="hc-float absolute -left-2 bottom-16 w-52 rounded-md border border-white/10 bg-white/95 p-3.5 shadow-lift backdrop-blur sm:-left-10" style={{ ["--d" as string]: "-2.5s" }}>
        <div className="flex items-center gap-3">
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-ink">
            <span className="hc-pulse-ring absolute inset-0 rounded-full border border-gold" />
            <Check className="size-4 text-gold-light" strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-ink">You&apos;re checked in</p>
            <p className="text-[11px] text-muted">8:02 am · In person</p>
          </div>
        </div>
      </div>

      {/* Welcome chip */}
      <div className="hc-float absolute -right-1 top-14 rounded-full border border-gold/30 bg-night-raised/90 px-3.5 py-2 text-[12px] font-semibold text-gold-light shadow-lift backdrop-blur sm:-right-8" style={{ ["--d" as string]: "-4s" }}>
        Welcome back, Ada
      </div>
    </div>
  );
}
