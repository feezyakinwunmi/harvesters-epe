"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Header link that marks itself current, with a gold underline. */
export function NavLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
        "after:absolute after:inset-x-3 after:bottom-0.5 after:h-[2px] after:origin-left after:rounded-full after:bg-accent after:transition-transform after:duration-300",
        active ? "text-ink after:scale-x-100" : "text-muted after:scale-x-0 hover:text-ink hover:after:scale-x-100",
        className,
      )}
    >
      {children}
    </Link>
  );
}
