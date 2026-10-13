import Link from "next/link";
import { Download, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { Avatar, Badge, EmptyState, Notice, Panel } from "@/components/ui/display";
import { Pagination, parsePage, SortHeader, Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GENDERS, MARITAL_STATUSES, MEMBERSHIP_STATUSES } from "@/lib/validation/member";
import { formatCalendarDate, formatDate } from "@/lib/time";
import { initials, sanitizeSearch } from "@/lib/text";

const PAGE_SIZE = 25;
type SP = Record<string, string | undefined>;

const SORTS: Record<string, { column: "last_name" | "created_at" | "date_joined_church"; defaultAsc: boolean }> = {
  name: { column: "last_name", defaultAsc: true },
  created: { column: "created_at", defaultAsc: false },
  joined: { column: "date_joined_church", defaultAsc: false },
};

export default async function MembersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await getAdminContext("members.view", "/admin/members");
  if (!ctx) return <AccessDenied />;
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const supabase = await createClient();

  let query = supabase
    .from("members")
    .select("id, member_number, first_name, last_name, preferred_name, phone, email, gender, membership_status, church_department, ministry_unit, school_name, is_student, created_at, date_joined_church, deleted_at", { count: "exact" });

  query = sp.archived === "1" ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
  for (const term of sanitizeSearch(sp.q).split(" ").filter(Boolean).slice(0, 4)) {
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,preferred_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,member_number.ilike.%${term}%`,
    );
  }
  if (sp.status) query = query.eq("membership_status", sp.status as "member");
  if (sp.gender) query = query.eq("gender", sp.gender);
  if (sp.marital) query = query.eq("marital_status", sp.marital);
  if (sp.department) query = query.eq("church_department", sp.department);
  if (sp.unit) query = query.eq("ministry_unit", sp.unit);
  if (sp.school) query = query.eq("school_name", sp.school);
  if (sp.occupation) query = query.eq("occupation", sp.occupation);
  if (sp.student === "yes") query = query.eq("is_student", true);
  if (sp.student === "no") query = query.eq("is_student", false);
  if (sp.joined_from) query = query.gte("date_joined_church", sp.joined_from);
  if (sp.joined_to) query = query.lte("date_joined_church", sp.joined_to);

  const sort = SORTS[sp.sort ?? ""] ?? SORTS.name!;
  const ascending = sp.dir ? sp.dir === "asc" : sort.defaultAsc;
  query = query.order(sort.column, { ascending, nullsFirst: false });
  if (sort.column === "last_name") query = query.order("first_name", { ascending });

  const from = (page - 1) * PAGE_SIZE;
  const [{ data: rows, count, error }, { data: options }] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.rpc("member_filter_options"),
  ]);
  const opts = (options ?? {}) as { departments?: string[]; units?: string[]; schools?: string[]; occupations?: string[] };
  const toOpts = (list?: string[]) => (list ?? []).map((v) => ({ value: v, label: v }));
  const params: SP = { ...sp };

  return (
    <>
      <PageHeader
        title="Members"
        description="Everyone who has registered or been registered at the usher desk."
        actions={
          <>
            {ctx.can("members.edit_private") ? (
              <Button asChild variant="secondary">
                <Link href={`/admin/members/export?${new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][])}`} prefetch={false}>
                  <Download aria-hidden /> Export CSV
                </Link>
              </Button>
            ) : null}
            {ctx.can("members.create") ? (
              <Button asChild><Link href="/admin/members/new"><UserPlus aria-hidden /> Add member</Link></Button>
            ) : null}
          </>
        }
      />
      {sp.erased ? <Notice tone="success" className="mb-6">The member&apos;s personal details were permanently erased. Attendance totals were kept.</Notice> : null}

      <Panel>
        <FilterBar
          path="/admin/members"
          keep={["sort", "dir", "archived"]}
          values={sp}
          fields={[
            { type: "search", name: "q", placeholder: "Search name, phone, email or member number" },
            { type: "select", name: "status", label: "Status", options: MEMBERSHIP_STATUSES },
            { type: "select", name: "gender", label: "Gender", options: GENDERS },
            { type: "select", name: "marital", label: "Marital status", options: MARITAL_STATUSES },
            { type: "select", name: "department", label: "Department", options: toOpts(opts.departments) },
            { type: "select", name: "unit", label: "Unit", options: toOpts(opts.units) },
            { type: "select", name: "student", label: "Student", options: [{ value: "yes", label: "Students" }, { value: "no", label: "Not students" }] },
            { type: "select", name: "school", label: "School", options: toOpts(opts.schools) },
            { type: "select", name: "occupation", label: "Occupation", options: toOpts(opts.occupations) },
            { type: "date", name: "joined_from", label: "Joined from" },
            { type: "date", name: "joined_to", label: "Joined to" },
          ]}
        />
        <div className="flex items-center gap-1 overflow-x-auto border-b border-line px-3 py-2 text-sm">
          <Link href="/admin/members" aria-current={sp.archived !== "1" ? "page" : undefined} className={sp.archived !== "1" ? "rounded-full bg-ink px-3.5 py-1.5 font-semibold text-white" : "rounded-full px-3.5 py-1.5 font-semibold text-muted transition-colors hover:bg-fill hover:text-ink"}>Active</Link>
          <Link href="/admin/members?archived=1" aria-current={sp.archived === "1" ? "page" : undefined} className={sp.archived === "1" ? "rounded-full bg-ink px-3.5 py-1.5 font-semibold text-white" : "rounded-full px-3.5 py-1.5 font-semibold text-muted transition-colors hover:bg-fill hover:text-ink"}>Archived</Link>
        </div>

        {error ? (
          <Notice tone="danger" className="m-4">Members couldn&apos;t load. Please refresh.</Notice>
        ) : !rows || rows.length === 0 ? (
          <EmptyState icon={<Users />} title={sp.q || Object.keys(sp).length ? "No members match these filters" : "No members yet"} description="New registrations from the website and the usher desk appear here." />
        ) : (
          <Table caption="Members">
            <THead>
              <tr>
                <SortHeader label="Name" column="name" path="/admin/members" params={params} />
                <TH>Phone</TH>
                <TH>Status</TH>
                <TH className="hidden lg:table-cell">Department / unit</TH>
                <SortHeader label="Joined" column="joined" path="/admin/members" params={params} className="hidden md:table-cell" />
                <SortHeader label="Registered" column="created" path="/admin/members" params={params} className="hidden md:table-cell" />
              </tr>
            </THead>
            <tbody>
              {rows.map((m) => (
                <TR key={m.id}>
                  <TD>
                    <Link href={`/admin/members/${m.id}`} className="flex items-center gap-3 font-semibold text-ink hover:underline">
                      <Avatar initials={initials(m.first_name, m.last_name)} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate">{m.preferred_name || m.first_name} {m.last_name}</span>
                        <span className="block text-xs font-normal text-muted tabular-nums">{m.member_number}</span>
                      </span>
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap tabular-nums">{m.phone ?? <span className="text-subtle">—</span>}</TD>
                  <TD>
                    <Badge tone={m.membership_status === "member" ? "accent" : m.membership_status === "first_timer" ? "warning" : "neutral"}>
                      {MEMBERSHIP_STATUSES.find((s) => s.value === m.membership_status)?.label}
                    </Badge>
                  </TD>
                  <TD className="hidden text-muted lg:table-cell">{[m.church_department, m.ministry_unit].filter(Boolean).join(" / ") || "—"}</TD>
                  <TD className="hidden whitespace-nowrap text-muted md:table-cell">{formatCalendarDate(m.date_joined_church)}</TD>
                  <TD className="hidden whitespace-nowrap text-muted md:table-cell">{formatDate(m.created_at)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination path="/admin/members" params={params} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
      </Panel>
    </>
  );
}
