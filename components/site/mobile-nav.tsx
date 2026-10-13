"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarDays, ChevronRight, ExternalLink, Home, LayoutDashboard, LogIn, LogOut, Menu, Newspaper, Sun, UserRound, X } from "lucide-react";
import { Drawer, DrawerClose } from "@/components/ui/drawer";
import { WheatField } from "@/components/site/art";
import { Wordmark } from "@/components/site/wordmark";
import type { AccountLink } from "@/components/site/account-menu";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: "home" | "today" | "news" | "events" };

const ICONS = { home: Home, today: Sun, news: Newspaper, events: CalendarDays, profile: UserRound, admin: LayoutDashboard, site: ExternalLink };

type Account = { name: string; subtitle?: string; initials: string; links: AccountLink[] } | null;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Phone menu: a dark drawer that slides in from the right. */
export function MobileNav({ links, account }: { links: NavItem[]; account: Account }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-line-strong bg-surface text-ink transition-colors active:scale-95 hover:bg-fill"
      >
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Open menu</span>
      </button>

      <Drawer open={open} onOpenChange={setOpen} side="right" title="Menu" className="bg-night text-white">
        <div className="hc-dots pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full" style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.3), transparent 65%)" }} />
        <WheatField className="pointer-events-none absolute -bottom-6 -right-8 h-48 opacity-30" />

        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-night-line px-5">
          <Wordmark tone="light" />
          <DrawerClose className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10">
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close menu</span>
          </DrawerClose>
        </div>

        <div className="relative flex flex-1 flex-col px-4 pb-6 pt-5">
          {account ? (
            <div className="mb-5 flex items-center gap-3 rounded-md border border-night-line bg-white/[0.04] p-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-gold-light ring-1 ring-gold/40">{account.initials}</span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{account.name}</p>
                {account.subtitle ? <p className="truncate text-xs text-white/50">{account.subtitle}</p> : null}
              </div>
            </div>
          ) : null}

          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-light/70">Explore</p>
          <ul className="hc-stagger space-y-1">
            {links.map((l, i) => {
              const Icon = ICONS[l.icon];
              const active = isActive(pathname, l.href);
              return (
                <li key={l.href} style={{ ["--i" as string]: i }}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-sm px-3 py-3 text-[15px] font-semibold transition-colors",
                      active ? "bg-white/[0.08] text-white" : "text-white/75 hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    {active ? <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gold" /> : null}
                    <span className={cn("flex size-9 items-center justify-center rounded-full", active ? "bg-gold text-night" : "bg-white/[0.06] text-gold-light")}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="flex-1">{l.label}</span>
                    <ChevronRight className="size-4 text-white/30 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>

          {account ? (
            <>
              <p className="mt-6 px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-light/70">Your account</p>
              <ul className="hc-stagger space-y-1">
                {account.links.map((l, i) => {
                  const Icon = ICONS[l.icon];
                  const active = isActive(pathname, l.href);
                  return (
                    <li key={l.href} style={{ ["--i" as string]: links.length + i }}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-sm px-3 py-3 text-[15px] font-semibold transition-colors",
                          active ? "bg-white/[0.08] text-white" : "text-white/75 hover:bg-white/[0.05] hover:text-white",
                        )}
                      >
                        <span className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-gold-light"><Icon className="size-4" aria-hidden /></span>
                        {l.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          <div className="mt-auto pt-8">
            {account ? (
              <form action={signOutAction}>
                <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 font-semibold text-white transition-colors hover:bg-white/[0.06]">
                  <LogOut className="size-4 text-gold-light" aria-hidden /> Sign out
                </button>
              </form>
            ) : (
              <div className="grid gap-2">
                <Link href="/register" onClick={() => setOpen(false)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-gold font-semibold text-night transition-colors hover:bg-gold-light">
                  Register <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="/sign-in" onClick={() => setOpen(false)} className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 font-semibold text-white transition-colors hover:bg-white/[0.06]">
                  <LogIn className="size-4 text-gold-light" aria-hidden /> Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
