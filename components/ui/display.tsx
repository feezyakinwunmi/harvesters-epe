import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "outline";

const toneClass: Record<Tone, string> = {
  neutral: "bg-fill text-text",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  outline: "border border-line-strong text-muted",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", toneClass[tone], className)}>
      {children}
    </span>
  );
}

export function Panel({ className, children, as: Tag = "section" }: { className?: string; children: React.ReactNode; as?: "section" | "div" | "article" }) {
  return <Tag className={cn("rounded-md border border-line bg-surface shadow-soft", className)}>{children}</Tag>;
}

export function PanelHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-sm bg-fill", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-ink text-gold-light ring-4 ring-accent-soft [&_svg]:size-5">{icon}</div> : null}
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Notice({ tone = "neutral", title, children, className }: { tone?: Tone; title?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-sm px-4 py-3 text-sm", toneClass[tone], className)}>
      {title ? <p className="font-bold">{title}</p> : null}
      {children ? <div className={cn(title && "mt-0.5", "leading-relaxed")}>{children}</div> : null}
    </div>
  );
}

export function Avatar({ src, initials, size = 40, className }: { src?: string | null; initials: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-fill text-xs font-bold text-muted", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

export function DefinitionList({ items, className }: { items: Array<{ label: string; value: React.ReactNode }>; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-semibold text-muted">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{item.value === null || item.value === undefined || item.value === "" ? <span className="text-subtle">—</span> : item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
