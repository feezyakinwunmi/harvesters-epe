import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/auth/session";
import { getServiceOptions } from "@/lib/data/admin";
import { getSettings } from "@/lib/settings";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { RecognitionForm } from "@/components/admin/recognition-form";
import { Panel } from "@/components/ui/display";

export const metadata = { title: "Edit recognition" };

export default async function EditRecognitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAdminContext("content.manage", `/admin/recognitions/${id}`);
  if (!ctx) return <AccessDenied />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: r }, { recognitionCategories }, services] = await Promise.all([
    supabase.from("member_recognitions").select("*").eq("id", id).maybeSingle(),
    getSettings(),
    getServiceOptions(),
  ]);
  if (!r) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/recognitions", label: "Recognitions" }} title={`${r.recognition_title}: ${r.display_name}`} />
      <Panel className="max-w-2xl p-6 sm:p-8">
        <RecognitionForm
          categories={recognitionCategories}
          services={services}
          d={{
            id: r.id,
            member: r.member_id ? { id: r.member_id, name: r.display_name, memberNumber: null, photoConsent: true, hasAccount: false, phoneLast4: null } : null,
            display_name: r.display_name,
            recognition_title: r.recognition_title,
            description: r.description,
            image_path: r.image_path,
            service_id: r.service_id,
            display_date: r.display_date,
            display_order: r.display_order,
            status: r.status,
          }}
        />
      </Panel>
    </>
  );
}
