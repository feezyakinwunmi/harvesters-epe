"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ExternalLink, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export type AccountLink = { href: string; label: string; icon: "profile" | "admin" | "site" };

const ICONS = { profile: UserRound, admin: LayoutDashboard, site: ExternalLink };

/**
 * Avatar button that opens a small menu: account links and sign out.
 * Closes on outside click, Escape and navigation.
 */
export function AccountMenu({
  name,
  subtitle,
  initials,
  links,
  tone = "light",
  placement = "down",
  compact = false,
}: {
  name: string;
  subtitle?: string;
  initials: string;
  links: AccountLink[];
  tone?: "light" | "dark";
  placement?: "down" | "up";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Arrow keys move between items.
  function onMenuKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]"));
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  }

  const dark = tone === "dark";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex items-center gap-2.5 rounded-full text-left transition-colors",
          compact ? "p-0.5" : "w-full py-1.5 pl-1.5 pr-3",
          dark ? "hover:bg-white/[0.06]" : "border border-line-strong bg-surface hover:border-accent/50",
          open && (dark ? "bg-white/[0.06]" : "border-accent/50"),
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-gold-light ring-1 ring-gold/40">
          {initials}
        </span>
        {compact ? null : (
          <>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-sm font-semibold", dark ? "text-white" : "text-ink")}>{name}</span>
              {subtitle ? <span className={cn("block truncate text-xs", dark ? "text-white/50" : "text-muted")}>{subtitle}</span> : null}
            </span>
            <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-300", dark ? "text-white/50" : "text-muted", open && "rotate-180", placement === "up" && !open && "rotate-180", placement === "up" && open && "rotate-0")} aria-hidden />
          </>
        )}
        <span className="sr-only">Account menu</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className={cn(
            "absolute z-50 w-64 overflow-hidden rounded-md border border-line bg-surface p-1.5 text-ink shadow-lift",
            placement === "down" ? "hc-pop right-0 top-[calc(100%+8px)]" : "hc-pop-up bottom-[calc(100%+8px)] left-0",
          )}
        >
          <div className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-gold-light">{initials}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{name}</p>
              {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
            </div>
          </div>
          <div className="py-1">
            {links.map((l) => {
              const Icon = ICONS[l.icon];
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold outline-none hover:bg-fill focus-visible:bg-fill"
                >
                  <Icon className="size-4 text-accent" aria-hidden /> {l.label}
                </Link>
              );
            })}
          </div>
          <form action={signOutAction} className="border-t border-line pt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold text-danger outline-none hover:bg-danger-soft focus-visible:bg-danger-soft"
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
