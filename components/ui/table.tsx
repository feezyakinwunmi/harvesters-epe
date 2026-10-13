import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Table({ className, children, caption }: { className?: string; children: React.ReactNode; caption?: string }) {
  return (
    // Scrolls sideways on phones, with soft edge shadows hinting at hidden columns.
    <div className="hc-scroll-x w-full">
      <table className={cn("w-full min-w-[34rem] border-collapse text-sm sm:min-w-0", className)}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-line bg-canvas/70 text-left">{children}</thead>;
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th scope="col" className={cn("h-10 whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted first:pl-4 last:pr-4 sm:px-4", className)}>{children}</th>;
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-b border-line transition-colors last:border-0 hover:bg-accent-soft/40", className)}>{children}</tr>;
}

export function TD({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn("px-3 py-3 align-middle text-text first:pl-4 last:pr-4 sm:px-4", className)}>{children}</td>;
}

/** Builds a URL that keeps current query params and overrides some. */
export function withParams(path: string, current: Record<string, string | undefined>, overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...overrides })) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function SortHeader({
  label,
  column,
  path,
  params,
  className,
}: {
  label: string;
  column: string;
  path: string;
  params: Record<string, string | undefined>;
  className?: string;
}) {
  const active = params.sort === column;
  const dir = active && params.dir === "asc" ? "asc" : "desc";
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : "asc";
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"} className={cn("h-10 whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted first:pl-4 last:pr-4 sm:px-4", className)}>
      <Link href={withParams(path, params, { sort: column, dir: nextDir, page: undefined })} className="inline-flex items-center gap-1 hover:text-ink">
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
      </Link>
    </th>
  );
}

export function Pagination({
  path,
  params,
  page,
  pageSize,
  total,
}: {
  path: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const linkClass = "inline-flex h-9 items-center gap-1 rounded-full border border-line-strong bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-accent/50 hover:bg-fill";
  const disabledClass = "pointer-events-none opacity-40";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <p>
        {total === 0 ? "No results" : <>Showing <span className="font-semibold text-ink">{from}–{to}</span> of {total.toLocaleString()}</>}
      </p>
      <div className="flex items-center gap-2">
        <Link aria-disabled={page <= 1} className={cn(linkClass, page <= 1 && disabledClass)} href={withParams(path, params, { page: String(page - 1) })}>
          <ChevronLeft className="size-4" aria-hidden /> <span className="max-sm:sr-only">Previous</span>
        </Link>
        <span className="tabular-nums">
          {page} / {pages}
        </span>
        <Link aria-disabled={page >= pages} className={cn(linkClass, page >= pages && disabledClass)} href={withParams(path, params, { page: String(page + 1) })}>
          <span className="max-sm:sr-only">Next</span> <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}

export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 100000 ? n : 1;
}
