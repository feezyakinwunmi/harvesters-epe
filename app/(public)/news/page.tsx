import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { WheatSprig } from "@/components/site/art";
import { getPublishedPosts } from "@/lib/data/content";
import { PostListItem } from "@/components/site/content-bits";
import { parsePage } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "News & announcements" };
export const revalidate = 60;

const PAGE_SIZE = 12;
const FILTERS = [
  { key: "all", label: "All", types: ["news", "announcement"] },
  { key: "news", label: "News", types: ["news"] },
  { key: "announcements", label: "Announcements", types: ["announcement"] },
] as const;

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string }> }) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const filter = FILTERS.find((f) => f.key === sp.type) ?? FILTERS[0];
  const { posts, total } = await getPublishedPosts([...filter.types], PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
    <PageHero
      eyebrow="News"
      icon={<Newspaper aria-hidden />}
      title={<>News & <span className="hc-gold-text">announcements.</span></>}
      description="Stories from the Epe family, and everything you need to know for the weeks ahead."
    />
    <div className="mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">
      <nav aria-label="Filter" className="inline-flex gap-1 rounded-full border border-line bg-surface p-1 shadow-soft">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/news" : `/news?type=${f.key}`}
            aria-current={f.key === filter.key ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              f.key === filter.key ? "bg-ink text-white" : "text-muted hover:bg-fill hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <div className="relative mt-10 flex flex-col items-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-surface px-6 py-20 text-center">
          <div className="hc-dots-ink absolute inset-0" aria-hidden />
          <WheatSprig className="relative h-20" />
          <p className="relative mt-5 text-h3 font-bold text-ink">No posts yet</p>
          <p className="relative mt-1 max-w-sm text-muted">Church news and announcements will appear here.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => <PostListItem key={p.id} post={p} href={`/news/${p.slug ?? p.id}`} />)}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-12 flex items-center justify-between rounded-full border border-line bg-surface px-5 py-3 text-sm">
          {page > 1 ? <Link className="font-semibold text-ink underline underline-offset-4" href={`/news?${new URLSearchParams({ ...(sp.type ? { type: sp.type } : {}), page: String(page - 1) })}`}>Newer</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link className="font-semibold text-ink underline underline-offset-4" href={`/news?${new URLSearchParams({ ...(sp.type ? { type: sp.type } : {}), page: String(page + 1) })}`}>Older</Link> : <span />}
        </nav>
      ) : null}
    </div>
    </>
  );
}
