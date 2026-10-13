import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import logoDark from "@/public/logo-dark.png";
import logoLight from "@/public/logo-light.png";

const HEIGHTS = { sm: "h-8", md: "h-10", lg: "h-14" } as const;

/**
 * The church logo. `tone="light"` (white artwork) for dark backgrounds,
 * `tone="dark"` (black artwork) for light ones.
 */
export function Wordmark({
  className,
  href = "/",
  tone = "dark",
  size = "md",
  priority = false,
}: {
  className?: string;
  href?: string;
  tone?: "dark" | "light";
  size?: keyof typeof HEIGHTS;
  priority?: boolean;
}) {
  return (
    <Link href={href} className={cn("group inline-flex shrink-0 items-center", className)} aria-label="Harvesters International Christian Centre, Epe: home">
      <Image
        src={tone === "light" ? logoLight : logoDark}
        alt="Harvesters International Christian Centre, Epe"
        priority={priority}
        sizes="160px"
        className={cn("w-auto transition-opacity duration-300 group-hover:opacity-80", HEIGHTS[size])}
      />
    </Link>
  );
}
