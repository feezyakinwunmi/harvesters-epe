"use client";
import * as React from "react";
import { ActionForm } from "@/components/ui/action-form";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { GENDERS, HEARD_ABOUT, MARITAL_STATUSES, MEMBERSHIP_STATUSES } from "@/lib/validation/member";
import type { ActionState } from "@/lib/actions/result";
import type { Tables } from "@/types/database";

type Member = Partial<Tables<"members">>;
type Private = Partial<Tables<"member_private">>;

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  member?: Member | null;
  privateDetails?: Private | null;
  /** Show and submit address / DOB / emergency contact. */
  showPrivate: boolean;
  /** Show membership status (pastoral / super admins). */
  showAdmin: boolean;
  hidden?: Record<string, string>;
  submitLabel?: string;
  onSuccess?: (state: ActionState) => void;
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-6 border-t border-line pt-8 first:border-0 first:pt-0 lg:grid-cols-[220px_1fr]">
      <div>
        <legend className="text-[15px] font-bold text-ink">{title}</legend>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function MemberProfileForm({ action, member, privateDetails, showPrivate, showAdmin, hidden, submitLabel = "Save changes", onSuccess }: Props) {
  const m = member ?? {};
  const p = privateDetails ?? {};
  const [isStudent, setIsStudent] = React.useState(Boolean(m.is_student));
  const baptized = m.is_baptized === true ? "yes" : m.is_baptized === false ? "no" : "";

  return (
    <ActionForm action={action} className="space-y-8" onSuccess={onSuccess}>
      {(state) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            {hidden ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}

            <Section title="Personal">
              <Field id="first_name" label="First name" error={e.first_name}>
                <Input name="first_name" defaultValue={m.first_name ?? ""} autoComplete="given-name" required />
              </Field>
              <Field id="last_name" label="Last name" error={e.last_name}>
                <Input name="last_name" defaultValue={m.last_name ?? ""} autoComplete="family-name" required />
              </Field>
              <Field id="middle_name" label="Middle name" optional error={e.middle_name}>
                <Input name="middle_name" defaultValue={m.middle_name ?? ""} autoComplete="additional-name" />
              </Field>
              <Field id="preferred_name" label="Preferred name" optional error={e.preferred_name}>
                <Input name="preferred_name" defaultValue={m.preferred_name ?? ""} />
              </Field>
              <Field id="gender" label="Gender" optional>
                <Select name="gender" defaultValue={m.gender ?? ""}>
                  <option value="">Not set</option>
                  {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </Select>
              </Field>
              <Field id="marital_status" label="Marital status" optional>
                <Select name="marital_status" defaultValue={m.marital_status ?? ""}>
                  <option value="">Not set</option>
                  {MARITAL_STATUSES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </Select>
              </Field>
            </Section>

            <Section title="Contact">
              <Field id="phone" label="Phone" optional error={e.phone}>
                <Input name="phone" type="tel" inputMode="tel" defaultValue={m.phone ?? ""} autoComplete="tel" />
              </Field>
              <Field id="whatsapp_number" label="WhatsApp" optional error={e.whatsapp_number}>
                <Input name="whatsapp_number" type="tel" inputMode="tel" defaultValue={m.whatsapp_number ?? ""} />
              </Field>
              <Field id="email" label="Email" optional error={e.email} className="sm:col-span-2" hint="Used for one-time sign-in codes on new devices.">
                <Input
                  name="email"
                  type="email"
                  inputMode="email"
                  defaultValue={m.email && !m.email.endsWith(".invalid") ? m.email : ""}
                  autoComplete="email"
                />
              </Field>
              <Field id="city" label="Town / area" optional>
                <Input name="city" defaultValue={m.city ?? ""} />
              </Field>
              <Field id="state" label="State" optional>
                <Select name="state" defaultValue={m.state ?? ""}>
                  <option value="">Not set</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="Outside Nigeria">Outside Nigeria</option>
                </Select>
              </Field>
            </Section>

            {showPrivate ? (
              <Section title="Private details" description="Visible only to you and pastoral staff.">
                <Field id="residential_address" label="Home address" optional className="sm:col-span-2" error={e.residential_address}>
                  <Textarea name="residential_address" rows={2} defaultValue={p.residential_address ?? ""} autoComplete="street-address" />
                </Field>
                <Field id="date_of_birth" label="Date of birth" optional error={e.date_of_birth}>
                  <Input name="date_of_birth" type="date" defaultValue={p.date_of_birth ?? ""} />
                </Field>
                <div className="hidden sm:block" />
                <Field id="emergency_contact_name" label="Emergency contact" optional error={e.emergency_contact_name}>
                  <Input name="emergency_contact_name" defaultValue={p.emergency_contact_name ?? ""} />
                </Field>
                <Field id="emergency_contact_phone" label="Emergency contact phone" optional error={e.emergency_contact_phone}>
                  <Input name="emergency_contact_phone" type="tel" inputMode="tel" defaultValue={p.emergency_contact_phone ?? ""} />
                </Field>
              </Section>
            ) : null}

            <Section title="Education & work">
              <div className="sm:col-span-2">
                <CheckboxField id="is_student" name="is_student" label="Student" checked={isStudent} onCheckedChange={setIsStudent} />
              </div>
              {isStudent ? (
                <>
                  <Field id="school_name" label="School" optional className="sm:col-span-2">
                    <Input name="school_name" defaultValue={m.school_name ?? ""} />
                  </Field>
                  <Field id="course_or_department" label="Course / department" optional>
                    <Input name="course_or_department" defaultValue={m.course_or_department ?? ""} />
                  </Field>
                  <Field id="education_level" label="Level" optional hint="e.g. 200 level">
                    <Input name="education_level" defaultValue={m.education_level ?? ""} />
                  </Field>
                  <Field id="graduation_year" label="Graduation year" optional error={e.graduation_year}>
                    <Input name="graduation_year" inputMode="numeric" maxLength={4} defaultValue={m.graduation_year ? String(m.graduation_year) : ""} />
                  </Field>
                </>
              ) : null}
              <Field id="occupation" label="Occupation" optional>
                <Input name="occupation" defaultValue={m.occupation ?? ""} />
              </Field>
              <Field id="company_or_business" label="Company / business" optional>
                <Input name="company_or_business" defaultValue={m.company_or_business ?? ""} />
              </Field>
            </Section>

            <Section title="Church life">
              <Field id="date_joined_church" label="Date joined the church" optional error={e.date_joined_church}>
                <Input name="date_joined_church" type="date" defaultValue={m.date_joined_church ?? ""} />
              </Field>
              <Field id="usual_service" label="Usual service" optional>
                <Input name="usual_service" defaultValue={m.usual_service ?? ""} />
              </Field>
              <Field id="church_department" label="Department" optional>
                <Input name="church_department" defaultValue={m.church_department ?? ""} />
              </Field>
              <Field id="ministry_unit" label="Ministry / unit" optional>
                <Input name="ministry_unit" defaultValue={m.ministry_unit ?? ""} />
              </Field>
              <Field id="previous_church" label="Previous church" optional>
                <Input name="previous_church" defaultValue={m.previous_church ?? ""} />
              </Field>
              <Field id="heard_about_church" label="How they heard about us" optional>
                <Select name="heard_about_church" defaultValue={m.heard_about_church ?? ""}>
                  <option value="">Not set</option>
                  {HEARD_ABOUT.map((h) => <option key={h} value={h}>{h}</option>)}
                  {m.heard_about_church && !(HEARD_ABOUT as readonly string[]).includes(m.heard_about_church) ? (
                    <option value={m.heard_about_church}>{m.heard_about_church}</option>
                  ) : null}
                </Select>
              </Field>
              <Field id="is_baptized" label="Baptised" optional>
                <Select name="is_baptized" defaultValue={baptized}>
                  <option value="">Not set</option>
                  <option value="yes">Yes</option>
                  <option value="no">Not yet</option>
                </Select>
              </Field>
              <div className="flex items-end pb-2">
                <CheckboxField id="interested_in_serving" name="interested_in_serving" label="Interested in serving" defaultChecked={Boolean(m.interested_in_serving)} />
              </div>
              {showAdmin ? (
                <>
                  <Field id="membership_status" label="Membership status">
                    <Select name="membership_status" defaultValue={m.membership_status ?? "first_timer"}>
                      {MEMBERSHIP_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </Select>
                  </Field>
                  <div className="flex items-end pb-2">
                    <CheckboxField id="is_first_timer" name="is_first_timer" label="Treat as first-timer" defaultChecked={m.is_first_timer ?? true} />
                  </div>
                </>
              ) : null}
            </Section>

            <Section title="Consent" description="Can be changed at any time.">
              <div className="space-y-4 sm:col-span-2">
                <CheckboxField id="consent_to_contact" name="consent_to_contact" label="Happy to be contacted" description="By phone, WhatsApp or email about church life and follow-up." defaultChecked={Boolean(m.consent_to_contact)} />
                <CheckboxField id="photo_consent" name="photo_consent" label="Happy to appear in photos and recognitions" description="Public church photos and the Today page." defaultChecked={Boolean(m.photo_consent)} />
              </div>
            </Section>

            <div className="flex justify-end border-t border-line pt-6">
              <SubmitButton size="lg">{submitLabel}</SubmitButton>
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}
