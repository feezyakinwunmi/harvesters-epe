import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { checkInUrl, qrSvg } from "@/lib/qr/session-qr";
import { getSettings } from "@/lib/settings";
import { formatLongDate, formatTime } from "@/lib/time";
import { AccessDenied } from "@/components/admin/access-denied";
import { PrintButton } from "@/components/admin/print-button";

export default async function PrintQrPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const ctx = await getAdminContext("services.manage", `/print/qr/${sessionId}`);
  if (!ctx) return <div className="mx-auto max-w-lg p-10"><AccessDenied /></div>;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();

  const supabase = await createClient();
  const { data: session } = await supabase.from("attendance_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) notFound();
  const [{ data: service }, { church }] = await Promise.all([
    supabase.from("services").select("title, starts_at, ends_at, location").eq("id", session.service_id).maybeSingle(),
    getSettings(),
  ]);
  if (!service) notFound();

  let svg: string;
  try {
    svg = await qrSvg(checkInUrl(session.id, "physical", session.qr_token_nonce, session.qr_token_hash), 900);
  } catch (e) {
    return <div className="mx-auto max-w-lg p-10 text-danger">{e instanceof Error ? e.message : "QR unavailable"}</div>;
  }

  return (
    <>
      <div className="no-print mx-auto flex max-w-[210mm] items-center justify-between px-4 py-4 text-sm">
        <Link href={`/admin/services/${session.service_id}`} className="font-semibold text-muted hover:text-ink">Back to service</Link>
        <PrintButton />
      </div>

      {/* A4 portrait: 210 × 297 mm */}
      <article className="print-sheet mx-auto mb-10 flex h-[297mm] w-[210mm] flex-col bg-white px-[18mm] pb-[16mm] pt-[18mm] text-black shadow-soft">
        <header className="flex items-start justify-between border-b-2 border-black pb-[6mm]">
          <div>
            <p className="text-[13pt] font-extrabold tracking-[-0.01em]">{church.name}</p>
            <p className="text-[11pt] text-neutral-600">{church.campus}</p>
          </div>
          <p className="text-right text-[10pt] text-neutral-600">{session.label}</p>
        </header>

        <section className="mt-[10mm]">
          <p className="text-[12pt] font-semibold text-[#7c5e1c]">Attendance check-in</p>
          <h1 className="mt-[2mm] text-[30pt] font-extrabold leading-[1.05] tracking-[-0.025em]">{service.title}</h1>
          <p className="mt-[3mm] text-[14pt]">
            {formatLongDate(service.starts_at)} · {formatTime(service.starts_at)}–{formatTime(service.ends_at)}
          </p>
          {service.location ? <p className="text-[12pt] text-neutral-600">{service.location}</p> : null}
        </section>

        <div className="mx-auto mt-[8mm] size-[120mm] [&_svg]:size-full" role="img" aria-label="Check-in QR code" dangerouslySetInnerHTML={{ __html: svg }} />

        <ol className="mt-[8mm] grid grid-cols-3 gap-[6mm] text-[11pt] leading-snug">
          <li><span className="block text-[18pt] font-extrabold">1</span>Open your phone&apos;s camera and point it at the code.</li>
          <li><span className="block text-[18pt] font-extrabold">2</span>Tap the link that appears. First visit? Add your name and number.</li>
          <li><span className="block text-[18pt] font-extrabold">3</span>You&apos;re checked in. Next time, one scan is all it takes.</li>
        </ol>

        <footer className="mt-auto flex items-end justify-between border-t border-neutral-300 pt-[4mm] text-[10pt] text-neutral-600">
          <p>No phone, or it isn&apos;t working? An usher will check you in.</p>
          <p className="tabular-nums">Check-in {formatTime(session.starts_at)}–{formatTime(session.ends_at)}</p>
        </footer>
      </article>
    </>
  );
}
