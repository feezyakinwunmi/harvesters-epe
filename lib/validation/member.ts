import { z } from "zod";

// Shared by the registration wizard (client) and server actions.
// The database re-validates and whitelists every field independently.

const optionalText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`).optional().or(z.literal(""));

export const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const MARITAL_STATUSES = [
  { value: "single", label: "Single" },
  { value: "engaged", label: "Engaged" },
  { value: "married", label: "Married" },
  { value: "widowed", label: "Widowed" },
  { value: "divorced", label: "Divorced" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const HEARD_ABOUT = [
  "Friend or family",
  "Social media",
  "Campus outreach",
  "Walked past the church",
  "Online service",
  "Event or programme",
  "Other",
] as const;

export const MEMBERSHIP_STATUSES = [
  { value: "first_timer", label: "First-timer" },
  { value: "visitor", label: "Visitor" },
  { value: "regular_attendee", label: "Regular attendee" },
  { value: "member", label: "Member" },
  { value: "inactive", label: "Inactive" },
] as const;

const phoneLike = z
  .string()
  .trim()
  .min(7, "Enter a phone number")
  .max(20, "That phone number looks too long")
  .regex(/^[+\d][\d\s()-]{6,}$/, "Use digits only, e.g. 0803 123 4567");

const genderValue = z.enum(["female", "male", "prefer_not_to_say", "other"]).optional().or(z.literal(""));
const maritalValue = z.enum(["single", "married", "engaged", "widowed", "divorced", "prefer_not_to_say"]).optional().or(z.literal(""));
const dateValue = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .optional()
  .or(z.literal(""));

export const registrationStepSchemas = {
  about: z.object({
    first_name: z.string().trim().min(1, "Enter your first name").max(80),
    last_name: z.string().trim().min(1, "Enter your last name").max(80),
    preferred_name: optionalText(80),
    gender: genderValue,
    marital_status: maritalValue,
    date_of_birth: dateValue,
  }),
  contact: z.object({
    phone: phoneLike,
    whatsapp_number: z.string().trim().max(20).optional().or(z.literal("")),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254).optional().or(z.literal("")),
    city: optionalText(80),
    state: optionalText(80),
  }),
  church: z.object({
    heard_about_church: optionalText(160),
    usual_service: optionalText(120),
    previous_church: optionalText(160),
    interested_in_serving: z.boolean(),
    is_student: z.boolean(),
    school_name: optionalText(160),
  }),
  consent: z.object({
    consent_to_contact: z.boolean(),
    photo_consent: z.boolean(),
    privacy_ack: z.literal(true, { error: "Please confirm you've read how we use your details" }),
  }),
};

export const registrationSchema = registrationStepSchemas.about
  .extend(registrationStepSchemas.contact.shape)
  .extend(registrationStepSchemas.church.shape)
  .extend(registrationStepSchemas.consent.shape)
  .extend({
    next: z.string().max(512).optional(),
    not_duplicate: z.boolean().optional(),
    // Honeypot: real people never fill this hidden field.
    website: z.string().max(0).optional().or(z.literal("")),
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

/** Optional details members can add or change later from /me/edit. */
export const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Enter a first name").max(80),
  middle_name: optionalText(80),
  last_name: z.string().trim().min(1, "Enter a last name").max(80),
  preferred_name: optionalText(80),
  gender: genderValue,
  marital_status: maritalValue,
  phone: phoneLike.optional().or(z.literal("")),
  whatsapp_number: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254).optional().or(z.literal("")),
  city: optionalText(80),
  state: optionalText(80),
  is_student: z.boolean(),
  school_name: optionalText(160),
  course_or_department: optionalText(160),
  education_level: optionalText(60),
  graduation_year: z
    .string()
    .regex(/^(19[5-9]\d|20\d\d|21[0-4]\d)?$/, "Enter a 4-digit year")
    .optional(),
  occupation: optionalText(120),
  company_or_business: optionalText(160),
  date_joined_church: dateValue,
  church_department: optionalText(120),
  ministry_unit: optionalText(120),
  usual_service: optionalText(120),
  previous_church: optionalText(160),
  is_baptized: z.enum(["yes", "no", ""]).optional(),
  interested_in_serving: z.boolean(),
  heard_about_church: optionalText(160),
  consent_to_contact: z.boolean(),
  photo_consent: z.boolean(),
});

export const privateSchema = z.object({
  residential_address: optionalText(400),
  date_of_birth: dateValue,
  emergency_contact_name: optionalText(120),
  emergency_contact_phone: z.string().trim().max(20).optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type PrivateInput = z.infer<typeof privateSchema>;

const PROFILE_TEXT_KEYS = [
  "first_name", "middle_name", "last_name", "preferred_name", "gender", "marital_status", "phone",
  "whatsapp_number", "email", "city", "state", "school_name", "course_or_department", "education_level",
  "graduation_year", "occupation", "company_or_business", "date_joined_church", "church_department",
  "ministry_unit", "usual_service", "previous_church", "heard_about_church",
] as const;

/** Reads profile fields from a FormData (checkboxes arrive as "on"). */
export function profileFromForm(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PROFILE_TEXT_KEYS) {
    const v = form.get(key);
    if (typeof v === "string") out[key] = v;
  }
  out.is_student = form.get("is_student") === "on";
  out.interested_in_serving = form.get("interested_in_serving") === "on";
  out.consent_to_contact = form.get("consent_to_contact") === "on";
  out.photo_consent = form.get("photo_consent") === "on";
  const baptized = form.get("is_baptized");
  out.is_baptized = typeof baptized === "string" ? baptized : "";
  return out;
}

export function privateFromForm(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ["residential_address", "date_of_birth", "emergency_contact_name", "emergency_contact_phone"]) {
    const v = form.get(key);
    if (typeof v === "string") out[key] = v;
  }
  return out;
}

/** Converts validated profile input into the JSON shape the SQL functions accept. */
export function toProfileJson(p: ProfileInput, normalizePhone: (s: string) => string | null): Record<string, string | boolean | null> {
  return {
    ...p,
    phone: p.phone ? (normalizePhone(p.phone) ?? p.phone) : "",
    whatsapp_number: p.whatsapp_number ? (normalizePhone(p.whatsapp_number) ?? p.whatsapp_number) : "",
    is_baptized: p.is_baptized === "yes" ? true : p.is_baptized === "no" ? false : null,
    graduation_year: p.graduation_year ?? "",
  };
}
