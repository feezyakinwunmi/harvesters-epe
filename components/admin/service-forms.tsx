"use client";
import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { ActionForm } from "@/components/ui/action-form";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { createSession, saveService } from "@/lib/actions/services-admin";
import { SERVICE_TYPES } from "@/lib/validation/service";

type ServiceDefaults = {
  id?: string;
  title?: string;
  description?: string | null;
  service_type?: string;
  starts_at_local?: string;
  ends_at_local?: string;
  location?: string | null;
  status?: string;
  allow_physical_attendance?: boolean;
  allow_online_attendance?: boolean;
};

export function ServiceForm({ defaults, isNew }: { defaults: ServiceDefaults; isNew: boolean }) {
  return (
    <ActionForm action={saveService} className="space-y-6">
      {(state) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            <input type="hidden" name="service_id" value={defaults.id ?? ""} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="title" label="Title" className="sm:col-span-2" error={e.title}>
                <Input name="title" defaultValue={defaults.title ?? ""} placeholder="Sunday Celebration Service" maxLength={160} />
              </Field>
              <Field id="service_type" label="Type">
                <Select name="service_type" defaultValue={defaults.service_type ?? "sunday_service"}>
                  {SERVICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field id="status" label="Status" hint="Draft services are hidden from members.">
                <Select name="status" defaultValue={defaults.status ?? "scheduled"}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>
              <Field id="starts_at" label="Starts" error={e.starts_at} hint="Church local time">
                <Input type="datetime-local" name="starts_at" defaultValue={defaults.starts_at_local ?? ""} />
              </Field>
              <Field id="ends_at" label="Ends" error={e.ends_at}>
                <Input type="datetime-local" name="ends_at" defaultValue={defaults.ends_at_local ?? ""} />
              </Field>
              <Field id="location" label="Location" optional className="sm:col-span-2">
                <Input name="location" defaultValue={defaults.location ?? ""} placeholder="Main auditorium, Epe" maxLength={200} />
              </Field>
              <Field id="description" label="Notes" optional className="sm:col-span-2">
                <Textarea name="description" rows={2} defaultValue={defaults.description ?? ""} maxLength={2000} />
              </Field>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-ink">Attendance</legend>
              <CheckboxField id="allow_physical_attendance" name="allow_physical_attendance" label="In person (QR at the entrance)" defaultChecked={defaults.allow_physical_attendance ?? true} />
              <CheckboxField id="allow_online_attendance" name="allow_online_attendance" label="Online (a separate link to share in the livestream)" defaultChecked={defaults.allow_online_attendance ?? false} />
              {e.allow_physical_attendance ? <p role="alert" className="text-xs font-medium text-danger">{e.allow_physical_attendance}</p> : null}
              {isNew ? (
                <div className="rounded-sm bg-canvas p-3">
                  <CheckboxField
                    id="create_session"
                    name="create_session"
                    label="Create the QR code now"
                    description="Check-in opens shortly before the start and closes after the end, using the times in Settings. You can add more sessions later."
                    defaultChecked
                  />
                </div>
              ) : null}
            </fieldset>
            <div className="flex justify-end border-t border-line pt-5">
              <SubmitButton size="lg">{isNew ? "Create service" : "Save changes"}</SubmitButton>
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}

export function SessionForm({ serviceId, defaultStart, defaultEnd }: { serviceId: string; defaultStart: string; defaultEnd: string }) {
  return (
    <ActionForm action={createSession} className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="service_id" value={serviceId} />
          <Field id="s-label" label="Label" error={state.fieldErrors?.label} hint="e.g. Main entrance, Children's church, Overflow hall">
            <Input name="label" defaultValue="Main attendance" maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="s-start" label="Check-in opens" error={state.fieldErrors?.starts_at}>
              <Input type="datetime-local" name="starts_at" defaultValue={defaultStart} />
            </Field>
            <Field id="s-end" label="Check-in closes" error={state.fieldErrors?.ends_at}>
              <Input type="datetime-local" name="ends_at" defaultValue={defaultEnd} />
            </Field>
          </div>
          <SubmitButton>Create QR session</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function CopyLink({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          toast.success("Link copied");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Couldn't copy. Select the link and copy it manually.");
        }
      }}
    >
      <Copy aria-hidden /> {copied ? "Copied" : label}
    </Button>
  );
}
