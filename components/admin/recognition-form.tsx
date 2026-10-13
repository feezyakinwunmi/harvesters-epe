"use client";
import { useContext, useState } from "react";
import { ActionForm, ActionPendingContext } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { MemberPicker } from "@/components/admin/member-picker";
import { MediaUploader } from "@/components/admin/media-uploader";
import { saveRecognition } from "@/lib/actions/recognitions";
import type { MemberOption } from "@/lib/actions/lookup";

type Defaults = {
  id?: string;
  member?: MemberOption | null;
  display_name?: string;
  recognition_title?: string;
  description?: string | null;
  image_path?: string | null;
  service_id?: string | null;
  display_date?: string;
  display_order?: number;
  status?: string;
};

function shortName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]!.charAt(0)}.` : full;
}

function Buttons({ published }: { published: boolean }) {
  const pending = useContext(ActionPendingContext);
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>{published ? "Save" : "Save draft"}</Button>
      {!published ? <Button type="submit" name="intent" value="publish" disabled={pending}>{pending ? "Saving…" : "Publish"}</Button> : null}
    </div>
  );
}

export function RecognitionForm({ d, categories, services }: { d: Defaults; categories: string[]; services: Array<{ id: string; label: string }> }) {
  const [displayName, setDisplayName] = useState(d.display_name ?? "");
  const [custom, setCustom] = useState(Boolean(d.recognition_title && !categories.includes(d.recognition_title)));
  return (
    <ActionForm action={saveRecognition} className="space-y-5">
      {(state) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            <input type="hidden" name="id" value={d.id ?? ""} />
            <MemberPicker
              name="member_id"
              label="Member"
              defaultValue={d.member ?? null}
              requirePhotoConsent
              onChange={(m) => { if (m && !displayName) setDisplayName(shortName(m.name)); }}
            />
            <p className="-mt-3 text-xs text-muted">Only members who agreed to photos and recognition can be chosen.</p>
            <Field id="display_name" label="Name as shown" error={e.display_name} hint="First name and initial is usually enough.">
              <Input name="display_name" value={displayName} onChange={(ev) => setDisplayName(ev.target.value)} maxLength={120} />
            </Field>
            <Field id="recognition_title" label="Recognition" error={e.recognition_title}>
              {custom ? (
                <Input name="recognition_title" defaultValue={d.recognition_title ?? ""} maxLength={80} placeholder="Most Welcoming" />
              ) : (
                <Select name="recognition_title" defaultValue={d.recognition_title ?? categories[0] ?? ""}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              )}
            </Field>
            <button type="button" onClick={() => setCustom((c) => !c)} className="-mt-3 text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink">
              {custom ? "Choose from the approved list" : "Use a different church-approved title"}
            </button>
            <Field id="description" label="A line about it" optional>
              <Textarea name="description" rows={2} defaultValue={d.description ?? ""} maxLength={400} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="display_date" label="Show from" error={e.display_date}>
                <Input type="date" name="display_date" defaultValue={d.display_date ?? new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field id="display_order" label="Order" optional hint="Lower numbers show first">
                <Input type="number" name="display_order" min={0} max={999} defaultValue={String(d.display_order ?? 0)} />
              </Field>
            </div>
            <Field id="service_id" label="Service" optional>
              <Select name="service_id" defaultValue={d.service_id ?? ""}>
                <option value="">Not linked</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
            </Field>
            <MediaUploader name="image_path" label="Photo (optional)" prefix="recognitions" initial={d.image_path ? [d.image_path] : []} />
            <div className="border-t border-line pt-4"><Buttons published={d.status === "published"} /></div>
          </>
        );
      }}
    </ActionForm>
  );
}
