import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { checkInUrl, qrPng, qrSvg } from "@/lib/qr/session-qr";
import { slugify } from "@/lib/text";
import { localDateKey } from "@/lib/time";

// Downloads a session's QR code. Admin-only; the session row is read through
// RLS, so only attendance/super admins can obtain it.
export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return new NextResponse("Not found", { status: 404 });
  const roles = await getAdminRoles();
  if (!can(roles, "services.manage")) return new NextResponse("Forbidden", { status: 403 });

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("id, label, qr_token_nonce, qr_token_hash, services(title, starts_at)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return new NextResponse("Not found", { status: 404 });

  let url: string;
  try {
    url = checkInUrl(session.id, "physical", session.qr_token_nonce, session.qr_token_hash);
  } catch {
    return new NextResponse("This QR can no longer be generated. Create a new session.", { status: 409 });
  }

  const service = session.services as unknown as { title: string; starts_at: string } | null;
  const base = `qr-${slugify(service?.title ?? "service") || "service"}-${service ? localDateKey(new Date(service.starts_at)) : "session"}-${slugify(session.label) || "main"}`;
  const headers = { "Cache-Control": "private, no-store" };

  if (request.nextUrl.searchParams.get("format") === "svg") {
    return new NextResponse(await qrSvg(url, 1024), {
      headers: { ...headers, "Content-Type": "image/svg+xml", "Content-Disposition": `attachment; filename="${base}.svg"` },
    });
  }
  const png = await qrPng(url, 1200);
  return new NextResponse(new Uint8Array(png), {
    headers: { ...headers, "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${base}.png"` },
  });
}
