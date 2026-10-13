import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { Wordmark } from "@/components/site/wordmark";
import { Ornament, WheatField } from "@/components/site/art";

const COLUMNS = [
  { title: "Explore", links: [{ href: "/today", label: "Today at Epe" }, { href: "/events", label: "Events" }, { href: "/news", label: "News & announcements" }] },
  { title: "Your account", links: [{ href: "/register", label: "Register" }, { href: "/sign-in", label: "Sign in" }, { href: "/me", label: "My profile" }] },
  { title: "About", links: [{ href: "/privacy", label: "Privacy notice" }] },
];

export async function SiteFooter() {
  const { church } = await getSettings();
  return (
    <footer className="relative mt-28 overflow-hidden bg-night text-white/70">
      <div className="hc-dots absolute inset-0 opacity-40" aria-hidden />
      <div
        aria-hidden
        className="absolute -right-40 -top-40 size-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, rgb(176 141 62 / 0.22), transparent 62%)" }}
      />
      <WheatField className="absolute -bottom-6 right-0 hidden h-64 opacity-40 lg:block" />

      <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Wordmark tone="light" />
            <p className="mt-5 leading-relaxed text-white/60">
              {church.name}, {church.campus}. A place to belong, grow and serve.
            </p>
            <Ornament className="mt-6" />
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-light/80">{col.title}</p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="hc-underline pb-0.5 text-white/70 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-night-line pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {church.short_name}</p>
          <p>Register once. Check in with a single scan.</p>
        </div>
      </div>
    </footer>
  );
}
