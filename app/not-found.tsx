import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SunRays, WheatField } from "@/components/site/art";
import { Wordmark } from "@/components/site/wordmark";

export default function NotFound() {
  return (
    <main id="main" className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-night px-5 text-white">
      <div className="hc-dots absolute inset-0 -z-10 opacity-50" aria-hidden />
      <SunRays className="absolute left-1/2 top-1/2 -z-10 size-[820px] -translate-x-1/2 -translate-y-1/2 opacity-70" />
      <WheatField className="absolute -bottom-10 left-1/2 -z-10 h-64 -translate-x-1/2 opacity-50" />
      <div className="mx-auto w-full max-w-6xl pt-6 sm:px-3">
        <Wordmark tone="light" />
      </div>
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center pb-40 text-center">
        <p className="hc-gold-text hc-rise text-[6rem] font-extrabold leading-none tracking-[-0.05em]">404</p>
        <h1 className="hc-rise mt-4 text-[2rem] font-extrabold leading-tight tracking-[-0.03em] text-white" style={{ ["--d" as string]: "80ms" }}>
          We couldn&apos;t find that page.
        </h1>
        <p className="hc-rise mt-3 text-white/60" style={{ ["--d" as string]: "160ms" }}>It may have moved, or the link may be incomplete.</p>
        <Link
          href="/"
          className="hc-rise group mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-gold px-6 font-semibold text-night transition-colors hover:bg-gold-light"
          style={{ ["--d" as string]: "240ms" }}
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden /> Go to the home page
        </Link>
      </div>
    </main>
  );
}
