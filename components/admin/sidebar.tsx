"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, CalendarDays, ClipboardCheck, FileClock, HeartHandshake, LayoutDashboard, Medal,
  Menu, MoreHorizontal, Newspaper, QrCode, Settings, ShieldCheck, Sun, Users, X,
} from "lucide-react";
import type { NavKey } from "@/lib/auth/permissions";
import { Wordmark } from "@/components/site/wordmark";
import { AccountMenu, type AccountLink } from "@/components/site/account-menu";
import { Drawer, DrawerClose } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const ICONS: Record<NavKey, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  members: Users,
  attendance: ClipboardCheck,
  services: QrCode,
  "follow-up": HeartHandshake,
  today: Sun,
  news: Newspaper,
  events: CalendarDays,
  recognitions: Medal,
  roles: ShieldCheck,
  settings: Settings,
  audit: FileClock,
};

const SHORT_LABELS: Partial<Record<NavKey, string>> = {
  services: "Services",
  today: "Today",
  news: "News",
  "follow-up": "Follow-up",
};

const GROUP_LABELS = { people: "People & attendance", content: "Content", system: "System" } as const;

// Shown in the phone tab bar, in this order, when the person has access.
const TAB_PRIORITY: NavKey[] = ["overview", "members", "attendance", "services", "today", "news", "events", "follow-up", "recognitions"];

type Item = { key: NavKey; href: string; label: string; group: keyof typeof GROUP_LABELS };

const ACCOUNT_LINKS: AccountLink[] = [
  { href: "/", label: "View the website", icon: "site" },
  { href: "/me", label: "My profile", icon: "profile" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ items, onNavigate }: { items: Item[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = (Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>)
    .map((g) => ({ g, items: items.filter((i) => i.group === g) }))
    .filter((x) => x.items.length);
  let n = 0;
  return (
    <nav aria-label="Admin" className="space-y-6">
      {groups.map(({ g, items: groupItems }) => (
        <div key={g}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-light/60">{GROUP_LABELS[g]}</p>
          <ul className="hc-stagger space-y-0.5">
            {groupItems.map((item) => {
              const Icon = ICONS[item.key] ?? BarChart3;
              const active = isActive(pathname, item.href);
              return (
                <li key={item.key} style={{ ["--i" as string]: n++ }}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold transition-colors",
                      active ? "bg-white/[0.09] text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("absolute inset-y-2 left-0 w-[3px] rounded-full bg-gold transition-transform duration-300", active ? "scale-y-100" : "scale-y-0")}
                    />
                    <Icon className={cn("size-[18px] shrink-0 transition-colors", active ? "text-gold-light" : "text-white/40 group-hover:text-gold-light")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Wordmark href="/admin" tone="light" size="sm" />
      <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gold-light">Admin</span>
    </div>
  );
}

function Backdrop() {
  return (
    <>
      <div className="hc-dots pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full" style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.22), transparent 65%)" }} />
    </>
  );
}

export function AdminSidebar({ items, userLabel, roleLabel, initials }: { items: Item[]; userLabel: string; roleLabel: string; initials: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  const tabs = TAB_PRIORITY.map((k) => items.find((i) => i.key === k)).filter((i): i is Item => Boolean(i)).slice(0, 4);
  const moreActive = !tabs.some((t) => isActive(pathname, t.href));
  const current = items.find((i) => isActive(pathname, i.href));

  return (
    <>
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-night text-white lg:flex">
        <Backdrop />
        <div className="relative flex h-16 shrink-0 items-center border-b border-night-line px-5">
          <Brand />
        </div>
        <div className="relative flex-1 overflow-y-auto px-3 py-6 [scrollbar-width:thin]">
          <NavList items={items} />
        </div>
        <div className="relative border-t border-night-line p-3">
          <AccountMenu name={userLabel} subtitle={roleLabel} initials={initials} links={ACCOUNT_LINKS} tone="dark" placement="up" />
        </div>
      </aside>

      {/* ---------- Phone & tablet top bar ---------- */}
      <div className="no-print sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink transition-transform active:scale-95"
            aria-label="Open admin menu"
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <Menu className="size-5" />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-[15px] font-bold text-ink">{current?.label ?? "Admin"}</p>
          <AccountMenu name={userLabel} subtitle={roleLabel} initials={initials} links={ACCOUNT_LINKS} compact />
        </div>
      </div>

      {/* ---------- Drawer ---------- */}
      <Drawer open={open} onOpenChange={setOpen} side="left" title="Admin menu" className="bg-night text-white">
        <Backdrop />
        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-night-line px-5">
          <Brand />
          <DrawerClose className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white hover:bg-white/10">
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close menu</span>
          </DrawerClose>
        </div>
        <div className="relative flex-1 px-3 py-6">
          <NavList items={items} onNavigate={() => setOpen(false)} />
        </div>
        <div className="relative border-t border-night-line px-5 py-4">
          <p className="truncate text-sm font-semibold">{userLabel}</p>
          <p className="truncate text-xs text-white/50">{roleLabel}</p>
        </div>
      </Drawer>

      {/* ---------- Phone tab bar ---------- */}
      <nav aria-label="Quick links" className="no-print hc-safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-2 pt-1.5 backdrop-blur-md lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {tabs.map((t) => {
            const Icon = ICONS[t.key] ?? BarChart3;
            const active = isActive(pathname, t.href);
            return (
              <li key={t.key}>
                <Link href={t.href} aria-current={active ? "page" : undefined} className="group flex flex-col items-center gap-1 rounded-sm py-1.5 active:scale-95">
                  <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-300", active ? "bg-ink text-gold-light" : "text-muted group-hover:text-ink")}>
                    <Icon className="size-[18px]" />
                  </span>
                  <span className={cn("max-w-full truncate text-[11px] font-semibold", active ? "text-ink" : "text-muted")}>{SHORT_LABELS[t.key] ?? t.label}</span>
                </Link>
              </li>
            );
          })}
          <li className={cn(tabs.length < 4 && "col-start-5")}>
            <button type="button" onClick={() => setOpen(true)} className="group flex w-full flex-col items-center gap-1 rounded-sm py-1.5 active:scale-95">
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-300", moreActive ? "bg-ink text-gold-light" : "text-muted group-hover:text-ink")}>
                <MoreHorizontal className="size-[18px]" />
              </span>
              <span className={cn("text-[11px] font-semibold", moreActive ? "text-ink" : "text-muted")}>More</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
