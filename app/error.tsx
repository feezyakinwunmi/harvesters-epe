"use client";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? error.message);
  }, [error]);
  return (
    <main id="main" className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center px-5 py-16">
      <span className="hc-rise flex size-14 items-center justify-center rounded-full bg-ink text-gold-light">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h1 className="hc-rise mt-6 text-h1 text-ink">Something went wrong</h1>
      <p className="hc-rise mt-3 text-muted">
        The page couldn&apos;t load. Try again; if it keeps happening, let the media or admin team know{error.digest ? <> and mention code <span className="font-mono text-ink">{error.digest}</span></> : null}.
      </p>
      <Button className="mt-8 w-fit rounded-full" onClick={reset}>
        <RotateCcw className="text-gold-light" aria-hidden /> Try again
      </Button>
    </main>
  );
}
