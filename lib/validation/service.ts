// Service types offered in the admin form. Stored as free text so new types need no migration.
export const SERVICE_TYPES = [
  { value: "sunday_service", label: "Sunday service" },
  { value: "midweek_service", label: "Midweek service" },
  { value: "prayer_meeting", label: "Prayer meeting" },
  { value: "youth_service", label: "Youth service" },
  { value: "special_event", label: "Special event" },
  { value: "conference", label: "Conference" },
  { value: "other", label: "Other" },
] as const;

export const STATUS_TONE: Record<string, "neutral" | "accent" | "success" | "warning" | "danger" | "outline"> = {
  draft: "outline",
  scheduled: "neutral",
  active: "success",
  closed: "neutral",
  cancelled: "danger",
};
