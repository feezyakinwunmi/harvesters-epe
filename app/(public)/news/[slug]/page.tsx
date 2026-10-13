import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Megaphone, Newspaper } from "lucide-react";
import { getPublishedPost } from "@/lib/data/content";
import { formatLongDate } from "@/lib/time";
import { MediaItem, PostBody } from "@/components/site/content-bits";
import { PageHero } from "@/components/site/page-hero";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(["news", "announcement"], slug);
  return post ? { title: post.title, description: post.summary ?? undefined } : { title: "Not found" };
}

export default async function NewsPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPublishedPost(["news", "announcement"], slug);
  if (!post) notFound();

  return (
    <article>
      <PageHero
        eyebrow={post.content_type === "announcement" ? "Announcement" : "News"}
        icon={post.content_type === "announcement" ? <Megaphone aria-hidden /> : <Newspaper aria-hidden />}
        title={post.title}
        description={post.summary}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/news" className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 font-semibold text-white/80 hover:border-gold/50 hover:text-white">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden /> All news
          </Link>
          <span className="inline-flex items-center gap-1.5 text-white/55">
            <CalendarDays className="size-4 text-gold" aria-hidden /> {formatLongDate(post.published_at)}
          </span>
        </div>
      </PageHero>
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
      {post.cover_image_path ? (
        <div className="hc-rise relative -mt-8 overflow-hidden rounded-md shadow-lift sm:-mt-12">
          <MediaItem path={post.cover_image_path} alt="" className="w-full object-cover" />
        </div>
      ) : null}
      <PostBody body={post.body} className="mt-12 space-y-5 text-[17px] leading-[1.8] text-text first-letter:float-left first-letter:mr-2 first-letter:text-[3.4rem] first-letter:font-extrabold first-letter:leading-[0.9] first-letter:text-accent" />
      {post.media_paths.length > 0 ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {post.media_paths.map((p) => <MediaItem key={p} path={p} alt={post.title} />)}
        </div>
      ) : null}
      </div>
    </article>
  );
}
