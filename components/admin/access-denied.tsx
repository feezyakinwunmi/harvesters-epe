import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-6 py-12 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-fill text-muted">
        <ShieldAlert className="size-5" aria-hidden />
      </div>
      <h1 className="mt-4 text-h3 font-bold text-ink">You don&apos;t have access to this section</h1>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {message ?? "Your admin role doesn't include this area. A super admin can change your role if you need it."}
      </p>
      <Link href="/admin" className="mt-6 inline-flex h-9 items-center rounded-sm border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-fill">
        Back to overview
      </Link>
    </div>
  );
}
