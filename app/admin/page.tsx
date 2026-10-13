import Link from "next/link";
import { CalendarClock, QrCode, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { TrendChart } from "@/components/admin/trend-chart";
import { AccessDenied } from "@/components/admin/access-denied";
import { Badge, EmptyState, Notice, Panel, PanelHeader } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { appTimezone, formatDateTime, formatLongDate, relativeFromNow } from "@/lib/time";

type Stats = {
  total_members: number;
  new_registrations_7d: number;
  new_registrations_30d: number;
  present_today: number;
  physical_today: number;
  online_today: number;
  first_timers_today: number;
  first_timers_30d: number;
  open_follow_ups: number | null;
  overdue_follow_ups: number | null;
  trend: Array<{ id: string; title: string; starts_at: string; physical: number; online: number }>;
  upcoming: Array<{ id: string; title: string; starts_at: string; ends_at: string; location: string | null; status: string; session_count: number }>;
  recent_activity: Array<{ id: string; action: string; summary: string | null; created_at: string; actor_name: string | null }> | null;
};

export default async function AdminOverviewPage() {
  const ctx = await getAdminContext("dashboard.view");
  if (!ctx) return <AccessDenied />;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats", { p_tz: appTimezone() });
  const s = (data ?? null) as Stats | null;

  return (
    <>
      <PageHeader
        title="Overview"
        description={formatLongDate(new Date().toISOString())}
        actions={
          <>
            {ctx.can("members.create") ? (
              <Button asChild variant="secondary"><Link href="/admin/members/new"><UserPlus aria-hidden /> Register someone</Link></Button>
            ) : null}
            {ctx.can("services.manage") ? (
              <Button asChild><Link href="/admin/services/new"><QrCode aria-hidden /> New service</Link></Button>
            ) : null}
          </>
        }
      />

      {error || !s ? (
        <Notice tone="danger" title="Dashboard figures couldn't load">Refresh the page. If it keeps failing, check the database migrations have been applied.</Notice>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard emphasis label="Present today" value={s.present_today} detail={`${s.physical_today} in person · ${s.online_today} online`} />
            <StatCard label="First-time visitors today" value={s.first_timers_today} detail={`${s.first_timers_30d} in the last 30 days`} />
            <StatCard label="New registrations" value={s.new_registrations_7d} detail={`Last 7 days · ${s.new_registrations_30d} in 30 days`} />
            <StatCard label="Total members" value={s.total_members.toLocaleString()} detail="Everyone with an active record" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <Panel>
              <PanelHeader title="Attendance trend" description="Last 10 services" action={ctx.can("attendance.view") ? <Link href="/admin/attendance" className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4">View attendance</Link> : undefined} />
              <TrendChart data={s.trend} />
            </Panel>

            <Panel>
              <PanelHeader title="Upcoming services" action={ctx.can("services.manage") ? <Link href="/admin/services" className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4">All</Link> : undefined} />
              {s.upcoming.length === 0 ? (
                <EmptyState icon={<CalendarClock />} title="Nothing scheduled" description="Create a service to generate its QR code." />
              ) : (
                <ul className="divide-y divide-line">
                  {s.upcoming.map((u) => (
                    <li key={u.id}>
                      <Link href={`/admin/services/${u.id}`} className="block px-5 py-3.5 hover:bg-canvas/60">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate font-semibold text-ink">{u.title}</p>
                          {u.session_count === 0 ? <Badge tone="warning">No QR yet</Badge> : <Badge tone="outline">{u.session_count} QR</Badge>}
                        </div>
                        <p className="mt-0.5 text-sm text-muted">{formatDateTime(u.starts_at)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {s.open_follow_ups !== null ? (
              <Panel>
                <PanelHeader title="Follow-up" action={<Link href="/admin/follow-up" className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4">Open</Link>} />
                <div className="grid grid-cols-2 gap-4 p-5">
                  <div>
                    <p className="text-sm text-muted">Open items</p>
                    <p className="text-2xl font-extrabold tabular-nums text-ink">{s.open_follow_ups}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Past due</p>
                    <p className={`text-2xl font-extrabold tabular-nums ${s.overdue_follow_ups ? "text-accent" : "text-ink"}`}>{s.overdue_follow_ups ?? 0}</p>
                  </div>
                </div>
              </Panel>
            ) : null}

            {s.recent_activity ? (
              <Panel>
                <PanelHeader title="Recent admin activity" action={<Link href="/admin/audit" className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4">Audit log</Link>} />
                {s.recent_activity.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-muted">No admin activity yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {s.recent_activity.map((a) => (
                      <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                        <p className="min-w-0 text-text">
                          <span className="font-semibold text-ink">{a.actor_name ?? "System"}</span> {(a.summary ?? a.action).replace(/^./, (c) => c.toLowerCase())}
                        </p>
                        <time dateTime={a.created_at} className="shrink-0 text-xs text-muted">{relativeFromNow(a.created_at)}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
