import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="hc-rise mb-6 sm:mb-8">
      {back ? (
        <Link href={back.href} className="group mb-3 inline-flex items-center gap-1 rounded-full py-1 text-sm font-semibold text-muted hover:text-ink">
          <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden /> {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-[-0.025em] text-ink sm:text-[1.875rem]">{title}</h1>
          {description ? <div className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</div> : null}
        </div>
        {actions ? (
          // On phones the actions share the full width; from sm they sit to the right.
          <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-auto max-sm:[&_a]:w-full max-sm:[&>button]:w-full">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
