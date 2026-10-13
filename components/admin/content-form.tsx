"use client";
import { ActionForm } from "@/components/ui/action-form";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/display";
import { MediaUploader } from "@/components/admin/media-uploader";
import { saveContent } from "@/lib/actions/content-admin";
import { CONTENT_META, type ContentType } from "@/lib/validation/content";
import { useContext } from "react";
import { ActionPendingContext } from "@/components/ui/action-form";

export type ContentDefaults = {
  id?: string;
  content_type: ContentType;
  title?: string;
  slug?: string | null;
  summary?: string | null;
  body?: string | null;
  key_takeaways?: string[];
  speaker_name?: string | null;
  scripture_reference?: string | null;
  event_starts_local?: string;
  event_ends_local?: string;
  event_location?: string | null;
  cover_image_path?: string | null;
  media_paths?: string[];
  is_featured?: boolean;
  display_order?: number;
  people_consent_confirmed?: boolean;
  status?: string;
};

function IntentButtons({ published }: { published: boolean }) {
  const pending = useContext(ActionPendingContext);
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="submit" name="intent" value="draft" variant="secondary" disabled={pending}>
        {published ? "Save changes" : "Save draft"}
      </Button>
      {!published ? (
        <Button type="submit" name="intent" value="publish" disabled={pending}>
          {pending ? "Saving…" : "Publish"}
        </Button>
      ) : null}
    </div>
  );
}

export function ContentForm({ d }: { d: ContentDefaults }) {
  const type = d.content_type;
  const meta = CONTENT_META[type];
  const isMedia = type === "service_photo" || type === "service_video";
  const published = d.status === "published";

  return (
    <ActionForm action={saveContent} className="space-y-6">
      {(state) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            <input type="hidden" name="id" value={d.id ?? ""} />
            <input type="hidden" name="content_type" value={type} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="title" label={isMedia ? "Caption / album title" : "Title"} className="sm:col-span-2" error={e.title}>
                <Input name="title" defaultValue={d.title ?? ""} maxLength={200} />
              </Field>

              {type === "today_message" ? (
                <>
                  <Field id="speaker_name" label="Speaker" optional>
                    <Input name="speaker_name" defaultValue={d.speaker_name ?? ""} maxLength={120} />
                  </Field>
                  <Field id="scripture_reference" label="Scripture" optional>
                    <Input name="scripture_reference" defaultValue={d.scripture_reference ?? ""} placeholder="John 15:1–8" maxLength={120} />
                  </Field>
                </>
              ) : null}

              {type === "event" ? (
                <>
                  <Field id="event_starts_at" label="Starts" error={e.event_starts_at}>
                    <Input type="datetime-local" name="event_starts_at" defaultValue={d.event_starts_local ?? ""} />
                  </Field>
                  <Field id="event_ends_at" label="Ends" optional error={e.event_ends_at}>
                    <Input type="datetime-local" name="event_ends_at" defaultValue={d.event_ends_local ?? ""} />
                  </Field>
                  <Field id="event_location" label="Location" optional className="sm:col-span-2">
                    <Input name="event_location" defaultValue={d.event_location ?? ""} maxLength={200} />
                  </Field>
                </>
              ) : null}

              {!isMedia ? (
                <Field id="summary" label="Summary" optional className="sm:col-span-2" hint="One or two sentences shown in lists." error={e.summary}>
                  <Textarea name="summary" rows={2} defaultValue={d.summary ?? ""} maxLength={600} />
                </Field>
              ) : null}

              {type === "today_message" ? (
                <Field id="key_takeaways" label="Key takeaways" optional className="sm:col-span-2" hint="One per line, up to 10.">
                  <Textarea name="key_takeaways" rows={5} defaultValue={(d.key_takeaways ?? []).join("\n")} />
                </Field>
              ) : null}

              {!isMedia ? (
                <Field id="body" label={type === "today_message" ? "Message notes" : "Body"} optional className="sm:col-span-2" hint="Plain text. Leave a blank line between paragraphs.">
                  <Textarea name="body" rows={10} defaultValue={d.body ?? ""} maxLength={20000} />
                </Field>
              ) : null}
            </div>

            <div className="grid gap-6 border-t border-line pt-6 md:grid-cols-2">
              {!isMedia ? <MediaUploader name="cover_image_path" label="Cover image" initial={d.cover_image_path ? [d.cover_image_path] : []} /> : <input type="hidden" name="cover_image_path" value="" />}
              <div className={isMedia ? "md:col-span-2" : ""}>
                <MediaUploader name="media_paths" label={isMedia ? (type === "service_video" ? "Videos" : "Photos") : "Gallery"} multiple allowVideo={type !== "news" && type !== "announcement"} initial={d.media_paths ?? []} />
                {e.media_paths ? <p role="alert" className="mt-2 text-xs font-medium text-danger">{e.media_paths}</p> : null}
              </div>
            </div>

            <div className="space-y-4 border-t border-line pt-6">
              {meta.people ? (
                <div>
                  <CheckboxField
                    id="people_consent_confirmed"
                    name="people_consent_confirmed"
                    label="People shown in these photos or videos are happy to be featured"
                    description="Don't publish close-ups of anyone who hasn't consented, and never children without a parent's consent."
                    defaultChecked={d.people_consent_confirmed ?? false}
                  />
                  {e.people_consent_confirmed ? <p role="alert" className="mt-2 text-xs font-medium text-danger">{e.people_consent_confirmed}</p> : null}
                </div>
              ) : null}
              <CheckboxField id="is_featured" name="is_featured" label="Feature at the top" defaultChecked={d.is_featured ?? false} />
              {!isMedia && type !== "today_message" ? (
                <Field id="slug" label="Web address" optional hint="Leave blank to generate from the title." className="max-w-md">
                  <Input name="slug" defaultValue={d.slug ?? ""} maxLength={80} pattern="[a-z0-9-]*" />
                </Field>
              ) : null}
              <input type="hidden" name="display_order" value={String(d.display_order ?? 0)} />
            </div>

            {published ? <Notice tone="neutral">This is live on the website. Saving updates it straight away.</Notice> : null}
            <div className="border-t border-line pt-5"><IntentButtons published={published} /></div>
          </>
        );
      }}
    </ActionForm>
  );
}
