"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { MemberPicker } from "@/components/admin/member-picker";
import { grantRole, saveSettings } from "@/lib/actions/system-admin";
import { ADMIN_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";

export function GrantRoleForm() {
  return (
    <ActionForm action={grantRole} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          <MemberPicker name="member_id" label="Person" error={state.fieldErrors?.member_id} />
          <Field id="role" label="Role">
            <Select name="role" defaultValue="attendance_admin">
              {ADMIN_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </Field>
          <ul className="space-y-1.5 text-xs text-muted">
            {ADMIN_ROLES.map((r) => <li key={r}><span className="font-semibold text-ink">{ROLE_LABELS[r]}:</span> {ROLE_DESCRIPTIONS[r]}</li>)}
          </ul>
          <SubmitButton>Grant role</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function SettingsForm({
  church,
  checkIn,
  categories,
}: {
  church: { name: string; campus: string; short_name: string; support_contact: string };
  checkIn: { opens_minutes_before: number; closes_minutes_after: number };
  categories: string[];
}) {
  return (
    <ActionForm action={saveSettings} className="space-y-8">
      {(state) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            <fieldset className="grid gap-5 sm:grid-cols-2">
              <legend className="mb-4 text-[15px] font-bold text-ink">Church details</legend>
              <Field id="name" label="Church name" className="sm:col-span-2" error={e.name}><Input name="name" defaultValue={church.name} /></Field>
              <Field id="campus" label="Campus" error={e.campus}><Input name="campus" defaultValue={church.campus} /></Field>
              <Field id="short_name" label="Short name" error={e.short_name}><Input name="short_name" defaultValue={church.short_name} /></Field>
              <Field id="support_contact" label="Help contact on check-in errors" optional className="sm:col-span-2" hint="e.g. the welcome team's WhatsApp number">
                <Input name="support_contact" defaultValue={church.support_contact} />
              </Field>
            </fieldset>
            <fieldset className="grid gap-5 border-t border-line pt-8 sm:grid-cols-2">
              <legend className="mb-4 text-[15px] font-bold text-ink">Default check-in window</legend>
              <Field id="opens_minutes_before" label="Opens (minutes before start)" error={e.opens_minutes_before}>
                <Input type="number" name="opens_minutes_before" min={0} max={240} defaultValue={checkIn.opens_minutes_before} />
              </Field>
              <Field id="closes_minutes_after" label="Closes (minutes after end)" error={e.closes_minutes_after}>
                <Input type="number" name="closes_minutes_after" min={0} max={480} defaultValue={checkIn.closes_minutes_after} />
              </Field>
            </fieldset>
            <fieldset className="border-t border-line pt-8">
              <legend className="mb-4 text-[15px] font-bold text-ink">Approved recognition titles</legend>
              <Field id="recognition_categories" label="One per line" error={e.recognition_categories}>
                <Textarea name="recognition_categories" rows={7} defaultValue={categories.join("\n")} />
              </Field>
            </fieldset>
            <div className="flex justify-end border-t border-line pt-5"><SubmitButton>Save settings</SubmitButton></div>
          </>
        );
      }}
    </ActionForm>
  );
}
