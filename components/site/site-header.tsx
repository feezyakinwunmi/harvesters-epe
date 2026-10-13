import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/site/wordmark";
import { MobileNav, type NavItem } from "@/components/site/mobile-nav";
import { NavLink } from "@/components/site/nav-link";
import { AccountMenu, type AccountLink } from "@/components/site/account-menu";
import { getAdminRoles, getCurrentMember, getSessionUser } from "@/lib/auth/session";
import { initials as toInitials, isSyntheticEmail } from "@/lib/text";

const LINKS: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/today", label: "Today", icon: "today" },
  { href: "/news", label: "News", icon: "news" },
  { href: "/events", label: "Events", icon: "events" },
];

export async function SiteHeader() {
  const user = await getSessionUser();
  // Both are per-request cached and shared with the page, so they run once, in parallel.
  const [roles, member] = user ? await Promise.all([getAdminRoles(), getCurrentMember()]) : [[], null];

  const account = user
    ? {
        name: member ? `${member.preferred_name || member.first_name} ${member.last_name}` : "Your account",
        subtitle: member?.member_number ?? (user.email && !isSyntheticEmail(user.email) ? user.email : undefined),
        initials: member ? toInitials(member.first_name, member.last_name) : "··",
        links: [
          { href: "/me", label: member ? "My profile & attendance" : "Complete registration", icon: "profile" },
          ...(roles.length ? [{ href: "/admin", label: "Admin dashboard", icon: "admin" } as AccountLink] : []),
        ] as AccountLink[],
      }
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.slice(1).map((l) => (
            <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
          ))}
          <span aria-hidden className="mx-3 h-5 w-px bg-line-strong" />
          {account ? (
            <AccountMenu name={account.name} subtitle={account.subtitle} initials={account.initials} links={account.links} />
          ) : (
            <>
              <NavLink href="/sign-in">Sign in</NavLink>
              <Link
                href="/register"
                className="group ml-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgb(176_141_62/0.45)] transition-colors hover:bg-night-raised"
              >
                Register <ArrowRight className="hc-nudge size-3.5 text-gold-light" aria-hidden />
              </Link>
            </>
          )}
        </nav>
        <MobileNav links={LINKS} account={account} />
      </div>
    </header>
  );
}
