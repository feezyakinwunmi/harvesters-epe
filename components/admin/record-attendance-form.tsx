"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { MemberPicker } from "@/components/admin/member-picker";
import { recordAttendance } from "@/lib/actions/attendance-admin";
import type { MemberOption } from "@/lib/actions/lookup";

type ServiceOption = { id: string; label: string; allowOnline: boolean };

/**
 * Usher-assisted / manual attendance. Reason is required and stored with the
 * acting admin in the audit log.
 */
export function RecordAttendanceForm({
  services,
  defaultServiceId,
  member,
}: {
  services: ServiceOption[];
  defaultServiceId?: string;
  member?: MemberOption | null;
}) {
  return (
    <ActionForm action={recordAttendance} className="space-y-4">
      {(state) => (
        <>
          {member ? (
            <input type="hidden" name="member_id" value={member.id} />
          ) : (
            <MemberPicker name="member_id" error={state.fieldErrors?.member_id} />
          )}
          <Field id="ra-service" label="Service" error={state.fieldErrors?.service_id}>
            <Select name="service_id" defaultValue={defaultServiceId ?? services[0]?.id ?? ""}>
              {services.length === 0 ? <option value="">No services yet</option> : null}
              {services.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ra-mode" label="Attended">
              <Select name="mode" defaultValue="physical">
                <option value="physical">In person</option>
                <option value="online">Online</option>
              </Select>
            </Field>
            <Field id="ra-method" label="How">
              <Select name="method" defaultValue="admin_assisted">
                <option value="admin_assisted">Usher-assisted (person present)</option>
                <option value="manual">Manual correction</option>
              </Select>
            </Field>
          </div>
          <Field id="ra-time" label="Check-in time" optional hint="Leave blank to use the current time.">
            <Input type="datetime-local" name="checked_in_at" />
          </Field>
          <Field id="ra-reason" label="Reason" error={state.fieldErrors?.reason} hint="Saved in the audit log with your name.">
            <Textarea name="reason" rows={2} maxLength={500} placeholder="No phone with them / phone battery died / scanned after close" />
          </Field>
          <SubmitButton className="w-full sm:w-auto">Record attendance</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
