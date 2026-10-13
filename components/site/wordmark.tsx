import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/site/art";

/** Logo tile plus typographic wordmark. `tone="light"` for dark backgrounds. */
export function Wordmark({
  className,
  href = "/",
  campus = "Epe",
  tone = "dark",
}: {
  className?: string;
  href?: string;
  campus?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`Harvesters ${campus} home`}>
      <LogoMark className="size-8 transition-transform duration-500 group-hover:rotate-[-6deg]" />
      <span className="inline-flex items-baseline gap-1.5">
        <span className={cn("text-[17px] font-extrabold tracking-[-0.02em]", tone === "light" ? "text-white" : "text-ink")}>Harvesters</span>
        <span className={cn("text-[17px] font-medium tracking-[-0.01em]", tone === "light" ? "text-gold-light" : "text-accent")}>{campus}</span>
      </span>
    </Link>
  );
}
