"use client";
import { ActionForm } from "@/components/ui/action-form";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { createFollowUp, logContact } from "@/lib/actions/followup";
import { CHANNELS } from "@/lib/validation/followup";


export function FollowUpForm({ memberId, staff }: { memberId: string; staff: Array<{ id: string; name: string }> }) {
  return (
    <ActionForm action={createFollowUp} resetOnSuccess className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="member_id" value={memberId} />
          <Field id="fu-subject" label="What needs doing?" error={state.fieldErrors?.subject}>
            <Input name="subject" placeholder="Welcome call after first visit" maxLength={200} />
          </Field>
          <Field id="fu-details" label="Notes" optional>
            <Textarea name="details" rows={2} maxLength={2000} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="fu-priority" label="Priority">
              <Select name="priority" defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field id="fu-due" label="Due" optional>
              <Input type="datetime-local" name="due_at" />
            </Field>
            <Field id="fu-assign" label="Assign to" optional>
              <Select name="assigned_to" defaultValue="">
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <SubmitButton>Add follow-up</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ContactLogForm({ memberId, openFollowUps }: { memberId: string; openFollowUps: Array<{ id: string; subject: string }> }) {
  return (
    <ActionForm action={logContact} resetOnSuccess className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="member_id" value={memberId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cl-channel" label="Channel">
              <Select name="channel" defaultValue="whatsapp">
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </Field>
            <Field id="cl-when" label="When" optional hint="Leave blank for now">
              <Input type="datetime-local" name="contacted_at" />
            </Field>
          </div>
          <Field id="cl-summary" label="Summary" error={state.fieldErrors?.message_summary}>
            <Textarea name="message_summary" rows={3} maxLength={2000} placeholder="Keep it factual and kind. The member may ask to see their record." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cl-outcome" label="Outcome" optional>
              <Input name="outcome" placeholder="Reached, will visit Sunday" maxLength={500} />
            </Field>
            <Field id="cl-next" label="Next step" optional>
              <Input name="next_step" placeholder="Invite to newcomers' lunch" maxLength={500} />
            </Field>
          </div>
          {openFollowUps.length > 0 ? (
            <div className="grid gap-3 rounded-sm bg-canvas p-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field id="cl-fu" label="Related follow-up" optional>
                <Select name="follow_up_id" defaultValue="">
                  <option value="">None</option>
                  {openFollowUps.map((f) => <option key={f.id} value={f.id}>{f.subject}</option>)}
                </Select>
              </Field>
              <div className="pb-2">
                <CheckboxField id="cl-complete" name="complete_follow_up" label="Mark it done" />
              </div>
            </div>
          ) : null}
          <SubmitButton>Log contact</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
