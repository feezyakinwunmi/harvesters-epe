import Link from "next/link";
import { Medal, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { deleteRecognition, setRecognitionStatus } from "@/lib/actions/recognitions";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Badge, EmptyState, Notice, Panel } from "@/components/ui/display";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/time";

export const metadata = { title: "Recognitions" };

export default async function RecognitionsPage({ searchParams }: { searchParams: Promise<{ saved?: string; status?: string }> }) {
  const ctx = await getAdminContext("content.manage", "/admin/recognitions");
  if (!ctx) return <AccessDenied />;
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("member_recognitions").select("*").order("display_date", { ascending: false }).order("display_order").limit(200);
  if (sp.status === "archived") q = q.eq("status", "archived");
  else q = q.neq("status", "archived");
  const { data, error } = await q;
  const rows = data ?? [];

  return (
    <>
      <PageHeader
        back={{ href: "/admin/today", label: "Today & Media" }}
        title="Recognitions"
        description="Fun, church-approved shout-outs for the Today page — Most Dressed, Best Energy and so on. Chosen by people, never by the system."
        actions={<Button asChild><Link href="/admin/recognitions/new"><Plus aria-hidden /> New recognition</Link></Button>}
      />
      {sp.saved ? <Notice tone="success" className="mb-6">Recognition saved.</Notice> : null}
      <Panel>
        <div className="flex gap-4 border-b border-line px-4 py-2 text-sm">
          <Link href="/admin/recognitions" className={sp.status !== "archived" ? "font-semibold text-ink" : "text-muted hover:text-ink"}>Current</Link>
          <Link href="/admin/recognitions?status=archived" className={sp.status === "archived" ? "font-semibold text-ink" : "text-muted hover:text-ink"}>Archived</Link>
        </div>
        {error ? (
          <Notice tone="danger" className="m-4">Couldn&apos;t load recognitions.</Notice>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Medal />} title="No recognitions yet" description="Celebrate someone from this week's service." />
        ) : (
          <Table caption="Recognitions">
            <THead><tr><TH>Recognition</TH><TH>Name shown</TH><TH>Date</TH><TH>Status</TH><TH className="text-right">Actions</TH></tr></THead>
            <tbody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD><Link href={`/admin/recognitions/${r.id}`} className="font-semibold text-ink hover:underline">{r.recognition_title}</Link></TD>
                  <TD>{r.display_name}</TD>
                  <TD className="whitespace-nowrap text-muted">{formatCalendarDate(r.display_date)}</TD>
                  <TD><Badge tone={r.status === "published" ? "success" : r.status === "draft" ? "outline" : "neutral"}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge></TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.status !== "published" ? (
                        <ConfirmAction action={setRecognitionStatus} hidden={{ id: r.id, status: "published" }} title="Publish this recognition?" description="It appears on the Today page." confirmLabel="Publish" trigger="Publish" />
                      ) : (
                        <ConfirmAction action={setRecognitionStatus} hidden={{ id: r.id, status: "archived" }} title="Archive this recognition?" description="It's removed from the Today page." confirmLabel="Archive" trigger="Archive" triggerVariant="ghost" />
                      )}
                      <ConfirmAction action={deleteRecognition} hidden={{ id: r.id }} title="Delete this recognition?" description="It and its photo are deleted." confirmLabel="Delete" trigger="Delete" triggerVariant="ghost" destructive />
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
