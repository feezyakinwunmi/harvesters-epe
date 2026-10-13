import { getAdminContext } from "@/lib/auth/session";
import { getServiceOptions } from "@/lib/data/admin";
import { getSettings } from "@/lib/settings";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { RecognitionForm } from "@/components/admin/recognition-form";
import { Panel } from "@/components/ui/display";
import { localDateKey } from "@/lib/time";

export const metadata = { title: "New recognition" };

export default async function NewRecognitionPage() {
  const ctx = await getAdminContext("content.manage", "/admin/recognitions/new");
  if (!ctx) return <AccessDenied />;
  const [{ recognitionCategories }, services] = await Promise.all([getSettings(), getServiceOptions()]);
  return (
    <>
      <PageHeader back={{ href: "/admin/recognitions", label: "Recognitions" }} title="New recognition" />
      <Panel className="max-w-2xl p-6 sm:p-8">
        <RecognitionForm d={{ display_date: localDateKey(), status: "draft" }} categories={recognitionCategories} services={services} />
      </Panel>
    </>
  );
}
