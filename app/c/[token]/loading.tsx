export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5" role="status" aria-live="polite">
      <div className="size-16 animate-pulse rounded-full border-4 border-line-strong" aria-hidden />
      <p className="mt-6 text-[17px] font-semibold text-ink">Checking you in…</p>
    </div>
  );
}
