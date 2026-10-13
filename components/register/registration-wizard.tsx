"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { ArrowLeft, ArrowRight, Check, Church, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { Notice } from "@/components/ui/display";
import { registerMember, type RegisterResult } from "@/lib/actions/auth";
import { GENDERS, HEARD_ABOUT, MARITAL_STATUSES, registrationSchema } from "@/lib/validation/member";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { cn } from "@/lib/utils";

type Values = {
  first_name: string;
  last_name: string;
  preferred_name: string;
  gender: string;
  marital_status: string;
  date_of_birth: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  city: string;
  state: string;
  heard_about_church: string;
  usual_service: string;
  previous_church: string;
  interested_in_serving: boolean;
  is_student: boolean;
  school_name: string;
  consent_to_contact: boolean;
  photo_consent: boolean;
  privacy_ack: boolean;
  website: string;
};

const STEPS = [
  { key: "about", title: "About you", fields: ["first_name", "last_name", "preferred_name", "gender", "marital_status", "date_of_birth"] },
  { key: "contact", title: "How to reach you", fields: ["phone", "whatsapp_number", "email", "city", "state"] },
  { key: "church", title: "You and the church", fields: ["heard_about_church", "usual_service", "previous_church", "interested_in_serving", "is_student", "school_name"] },
  { key: "consent", title: "Your choices", fields: ["consent_to_contact", "photo_consent", "privacy_ack"] },
] as const satisfies ReadonlyArray<{ key: string; title: string; fields: ReadonlyArray<keyof Values> }>;

const STEP_ICONS = { about: UserRound, contact: Phone, church: Church, consent: ShieldCheck } as const;

const DRAFT_KEY ="hc-registration-draft";

const EMPTY: Values = {
  first_name: "", last_name: "", preferred_name: "", gender: "", marital_status: "", date_of_birth: "",
  phone: "", whatsapp_number: "", email: "", city: "", state: "",
  heard_about_church: "", usual_service: "", previous_church: "", interested_in_serving: false, is_student: false, school_name: "",
  consent_to_contact: false, photo_consent: false, privacy_ack: false, website: "",
};

// Validate with the same zod schema the server uses.
const resolver: Resolver<Values> = async (values) => {
  const result = registrationSchema.safeParse(values);
  if (result.success) return { values, errors: {} };
  const errors: FieldErrors<Values> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof Values | undefined;
    if (key && !errors[key]) errors[key] = { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};

export function RegistrationWizard({ next, prefill }: { next: string; prefill?: Partial<Values> }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [whatsappSame, setWhatsappSame] = useState(true);

  const form = useForm<Values>({ resolver, defaultValues: { ...EMPTY, ...prefill }, mode: "onTouched" });
  const { register, handleSubmit, trigger, watch, setValue, setError, formState, getValues, reset } = form;
  const errors = formState.errors;

  // Restore an unfinished draft from this browser tab.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) reset({ ...EMPTY, ...prefill, ...(JSON.parse(raw) as Partial<Values>), privacy_ack: false });
    } catch {
      /* ignore unreadable drafts */
    }
  }, [reset, prefill]);

  useEffect(() => {
    const sub = watch((values) => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...values, website: "" }));
      } catch {
        /* storage unavailable (private mode) — drafts are a convenience */
      }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const isStudent = watch("is_student");
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  async function goNext() {
    const ok = await trigger([...current.fields]);
    if (ok) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      requestAnimationFrame(() => document.getElementById("wizard-heading")?.focus());
    }
  }

  function submit(values: Values, notDuplicate = false) {
    setResult(null);
    startTransition(async () => {
      const res = await registerMember({
        ...values,
        whatsapp_number: whatsappSame ? "" : values.whatsapp_number,
        next,
        not_duplicate: notDuplicate,
      });
      setResult(res);
      if (res.ok) {
        try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        window.location.assign(res.data?.redirectTo ?? "/me");
        return;
      }
      if (res.fieldErrors) {
        const firstStep = STEPS.findIndex((s) => s.fields.some((f) => res.fieldErrors?.[f]));
        for (const [k, message] of Object.entries(res.fieldErrors)) setError(k as keyof Values, { message });
        if (firstStep >= 0) setStep(firstStep);
      }
    });
  }

  const signInHref = `/sign-in?next=${encodeURIComponent(next)}`;

  return (
    <form
      onSubmit={(e) => {
        // Earlier steps validate only their own fields; the last step validates everything.
        if (!isLast) {
          e.preventDefault();
          void goNext();
          return;
        }
        void handleSubmit((v) => submit(v))(e);
      }}
      noValidate
      className="relative space-y-8"
    >
      <div className="relative">
        <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-5 h-0.5 rounded-full bg-fill">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>
        <ol className="relative grid grid-cols-4" aria-label="Registration steps">
          {STEPS.map((s, i) => {
            const Icon = STEP_ICONS[s.key];
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.key} className="relative flex flex-col items-center gap-2 text-center" aria-current={active ? "step" : undefined}>
                <span
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    done && "border-accent bg-accent text-white",
                    active && "border-ink bg-ink text-gold-light shadow-[0_0_0_5px_var(--accent-soft)]",
                    !done && !active && "border-line-strong bg-surface text-subtle",
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <Icon className="size-4" aria-hidden />}
                </span>
                <span className={cn("hidden text-xs font-semibold sm:block", active ? "text-ink" : "text-subtle")}>{s.title}</span>
                <span className="sr-only">{done ? "(done)" : active ? "(current)" : ""}</span>
              </li>
            );
          })}
        </ol>
        <div className="sr-only" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Registration progress" />
      </div>

      <div key={current.key} className="hc-step-in space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Step {step + 1} of {STEPS.length}</p>
        <h2 id="wizard-heading" tabIndex={-1} className="mt-1.5 text-h2 text-ink outline-none">{current.title}</h2>
      </div>

      {/* Honeypot for bots — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website <input tabIndex={-1} autoComplete="off" {...register("website")} /></label>
      </div>

      {current.key === "about" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="first_name" label="First name" error={errors.first_name?.message}>
            <Input autoComplete="given-name" {...register("first_name")} />
          </Field>
          <Field id="last_name" label="Last name (surname)" error={errors.last_name?.message}>
            <Input autoComplete="family-name" {...register("last_name")} />
          </Field>
          <Field id="preferred_name" label="What should we call you?" optional className="sm:col-span-2" hint="If you go by a different name.">
            <Input autoComplete="nickname" {...register("preferred_name")} />
          </Field>
          <Field id="gender" label="Gender" optional error={errors.gender?.message}>
            <Select {...register("gender")}>
              <option value="">Choose…</option>
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </Select>
          </Field>
          <Field id="marital_status" label="Marital status" optional>
            <Select {...register("marital_status")}>
              <option value="">Choose…</option>
              {MARITAL_STATUSES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </Select>
          </Field>
          <Field id="date_of_birth" label="Date of birth" optional className="sm:col-span-2" hint="So we can celebrate you. Only pastoral staff can see it." error={errors.date_of_birth?.message}>
            <Input type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} {...register("date_of_birth")} />
          </Field>
        </div>
      ) : null}

      {current.key === "contact" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="phone" label="Phone number" className="sm:col-span-2" error={errors.phone?.message} hint="Nigerian numbers can start with 0 or +234.">
            <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" {...register("phone")} />
          </Field>
          <div className="sm:col-span-2">
            <CheckboxField id="wa-same" label="I use this number on WhatsApp" checked={whatsappSame} onCheckedChange={setWhatsappSame} />
          </div>
          {!whatsappSame ? (
            <Field id="whatsapp_number" label="WhatsApp number" optional className="sm:col-span-2">
              <Input type="tel" inputMode="tel" {...register("whatsapp_number")} />
            </Field>
          ) : null}
          <Field
            id="email"
            label="Email"
            optional
            className="sm:col-span-2"
            error={errors.email?.message}
            hint="Recommended: lets you sign in on a new phone with a one-time code. Without it, an usher can help you."
          >
            <Input type="email" inputMode="email" autoComplete="email" {...register("email")} />
          </Field>
          <Field id="city" label="Town / area" optional>
            <Input autoComplete="address-level2" placeholder="Epe" {...register("city")} />
          </Field>
          <Field id="state" label="State" optional>
            <Select {...register("state")}>
              <option value="">Choose…</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="Outside Nigeria">Outside Nigeria</option>
            </Select>
          </Field>
        </div>
      ) : null}

      {current.key === "church" ? (
        <div className="grid gap-5">
          <Field id="heard_about_church" label="How did you hear about us?" optional>
            <Select {...register("heard_about_church")}>
              <option value="">Choose…</option>
              {HEARD_ABOUT.map((h) => <option key={h} value={h}>{h}</option>)}
            </Select>
          </Field>
          <Field id="usual_service" label="Which service do you usually attend?" optional>
            <Input list="usual-services" {...register("usual_service")} />
          </Field>
          <datalist id="usual-services">
            <option value="Sunday first service" />
            <option value="Sunday second service" />
            <option value="Midweek service" />
            <option value="Online" />
          </datalist>
          <Field id="previous_church" label="Previous church" optional>
            <Input {...register("previous_church")} />
          </Field>
          <CheckboxField
            id="interested_in_serving"
            label="I'd like to serve in a unit"
            description="Choir, ushering, media, children's church and more. Someone will reach out."
            checked={watch("interested_in_serving")}
            onCheckedChange={(v) => setValue("interested_in_serving", v)}
          />
          <CheckboxField
            id="is_student"
            label="I'm a student"
            checked={isStudent}
            onCheckedChange={(v) => setValue("is_student", v)}
          />
          {isStudent ? (
            <Field id="school_name" label="School" optional hint="Course and level can be added later in your profile.">
              <Input list="schools" {...register("school_name")} />
            </Field>
          ) : null}
          <datalist id="schools">
            <option value="Lagos State University, Epe Campus" />
          </datalist>
        </div>
      ) : null}

      {current.key === "consent" ? (
        <div className="space-y-5">
          <CheckboxField
            id="consent_to_contact"
            label="You may contact me"
            description="By phone, WhatsApp or email, about church life and follow-up. You can change this anytime."
            checked={watch("consent_to_contact")}
            onCheckedChange={(v) => setValue("consent_to_contact", v)}
          />
          <CheckboxField
            id="photo_consent"
            label="I'm happy to appear in church photos and recognitions"
            description="For example on the Today page. Leave unticked and we won't feature you."
            checked={watch("photo_consent")}
            onCheckedChange={(v) => setValue("photo_consent", v)}
          />
          <div className={cn("rounded-md border p-4", errors.privacy_ack ? "border-danger" : "border-line")}>
            <CheckboxField
              id="privacy_ack"
              label="I've read how my details are used"
              description={
                <>
                  Only authorised church staff can see your details, and we never sell or share them.{" "}
                  <Link href="/privacy" target="_blank" className="font-semibold text-ink underline underline-offset-2">
                    Read the privacy notice
                  </Link>
                  .
                </>
              }
              checked={watch("privacy_ack")}
              onCheckedChange={(v) => setValue("privacy_ack", v, { shouldValidate: true })}
            />
            {errors.privacy_ack ? <p role="alert" className="mt-2 text-xs font-medium text-danger">{errors.privacy_ack.message}</p> : null}
          </div>
        </div>
      ) : null}
      </div>

      {result && !result.ok ? (
        result.data?.existing === "email" ? (
          <Notice tone="warning" title="You already have an account">
            {result.message}{" "}
            <Link href={signInHref} className="font-semibold underline underline-offset-2">Sign in instead</Link>
          </Notice>
        ) : result.data?.existing === "possible_duplicate" ? (
          <Notice tone="warning" title="Have you registered before?">
            <p>{result.message} Sign in so your attendance stays on one record, or ask an usher for a code.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={signInHref} className="inline-flex h-9 items-center rounded-sm bg-ink px-3 text-sm font-semibold text-white">Sign in</Link>
              <Button variant="secondary" size="sm" className="h-9" onClick={() => submit(getValues(), true)} disabled={pending}>
                No, I&apos;m someone else
              </Button>
            </div>
          </Notice>
        ) : (
          <Notice tone="danger">{result.message}</Notice>
        )
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={pending}>
            <ArrowLeft aria-hidden /> Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" className="group min-w-40 rounded-full" disabled={pending}>
          {isLast ? (pending ? "Registering…" : "Register and continue") : "Continue"}
          {!pending ? <ArrowRight className="hc-nudge text-gold-light" aria-hidden /> : null}
        </Button>
      </div>
    </form>
  );
}
