"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? error.message);
  }, [error]);
  return (
    <div className="rounded-md border border-line bg-surface px-6 py-12 text-center">
      <h1 className="text-h3 font-bold text-ink">This page couldn&apos;t load</h1>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        Try again. If it keeps happening, check that all database migrations are applied{error.digest ? <> and quote reference <span className="font-mono text-ink">{error.digest}</span></> : null}.
      </p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
