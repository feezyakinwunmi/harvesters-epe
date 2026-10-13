import { getAdminContext } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { AccessDenied } from "@/components/admin/access-denied";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/system-forms";
import { DefinitionList, Panel, PanelHeader } from "@/components/ui/display";
import { publicEnv } from "@/lib/env";
import { appTimezone } from "@/lib/time";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getAdminContext("settings.manage", "/admin/settings");
  if (!ctx) return <AccessDenied />;
  const { church, checkIn, recognitionCategories } = await getSettings();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel className="p-6 sm:p-8">
          <SettingsForm church={church} checkIn={checkIn} categories={recognitionCategories} />
        </Panel>
        <Panel className="h-fit">
          <PanelHeader title="Deployment" description="Set through environment variables, not here." />
          <div className="p-5">
            <DefinitionList
              className="sm:grid-cols-1"
              items={[
                { label: "Site address printed in QR codes", value: publicEnv.siteUrl },
                { label: "Time zone", value: appTimezone() },
                { label: "Text-message sign-in codes", value: publicEnv.smsOtpEnabled ? "On" : "Off (email and usher codes only)" },
              ]}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}
