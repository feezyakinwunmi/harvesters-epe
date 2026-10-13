// Typed view of the public.check_in() RPC result and the copy shown for it.
// Pure module — unit tested.

export const CHECK_IN_STATUSES = [
  "checked_in",
  "already_checked_in",
  "auth_required",
  "needs_registration",
  "reauth_required",
  "not_open",
  "closed",
  "unavailable",
  "mode_not_allowed",
  "invalid",
] as const;

export type CheckInStatus = (typeof CHECK_IN_STATUSES)[number];
export type AttendanceMode = "physical" | "online";

export type CheckInResult = {
  status: CheckInStatus;
  mode: AttendanceMode | null;
  serviceTitle: string | null;
  serviceStartsAt: string | null;
  serviceEndsAt: string | null;
  location: string | null;
  sessionLabel: string | null;
  sessionStartsAt: string | null;
  sessionEndsAt: string | null;
  checkedInAt: string | null;
  recordedMode: AttendanceMode | null;
  memberFirstName: string | null;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function mode(v: unknown): AttendanceMode | null {
  return v === "physical" || v === "online" ? v : null;
}

/** Validates the untyped JSON returned by Postgres. Unknown shapes become "invalid". */
export function parseCheckInResult(raw: unknown): CheckInResult {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const status = (CHECK_IN_STATUSES as readonly string[]).includes(o.status as string)
    ? (o.status as CheckInStatus)
    : "invalid";
  return {
    status,
    mode: mode(o.mode),
    serviceTitle: str(o.service_title),
    serviceStartsAt: str(o.service_starts_at),
    serviceEndsAt: str(o.service_ends_at),
    location: str(o.location),
    sessionLabel: str(o.session_label),
    sessionStartsAt: str(o.session_starts_at),
    sessionEndsAt: str(o.session_ends_at),
    checkedInAt: str(o.checked_in_at),
    recordedMode: mode(o.recorded_mode),
    memberFirstName: str(o.member_first_name),
  };
}

export type Tone = "success" | "neutral" | "warning" | "error";

export function checkInCopy(result: CheckInResult): { title: string; body: string; tone: Tone } {
  const online = result.mode === "online";
  const name = result.memberFirstName;
  switch (result.status) {
    case "checked_in":
      return {
        title: name ? `You're in, ${name}.` : "You're checked in.",
        body: online ? "Thanks for joining online. Your attendance has been recorded." : "Welcome. Your attendance has been recorded.",
        tone: "success",
      };
    case "already_checked_in":
      return { title: "You're already checked in", body: "We recorded your attendance for this service earlier.", tone: "success" };
    case "auth_required":
      return { title: "Let's get you checked in", body: "First time here? Register in under a minute. Been here before? Continue with your details.", tone: "neutral" };
    case "needs_registration":
      return { title: "One quick step", body: "Your account doesn't have a member profile yet. Add your details and we'll check you in.", tone: "neutral" };
    case "reauth_required":
      return { title: "Confirm it's you", body: "For your security, please confirm your identity on this device. It takes a moment.", tone: "neutral" };
    case "not_open":
      return { title: "Check-in hasn't opened yet", body: "This code opens shortly before the service starts. Please scan again then.", tone: "warning" };
    case "closed":
      return { title: "Check-in for this service has closed", body: "If you attended, an usher or admin can record your attendance for you.", tone: "warning" };
    case "unavailable":
      return { title: "This service isn't available", body: "It may have been cancelled or moved. Please speak to an usher.", tone: "warning" };
    case "mode_not_allowed":
      return {
        title: online ? "Online check-in isn't enabled" : "In-person check-in isn't enabled",
        body: "This service doesn't accept this kind of check-in. Please speak to an usher.",
        tone: "warning",
      };
    case "invalid":
    default:
      return { title: "We don't recognise this code", body: "Please scan the code on the sheet again, or ask an usher for help.", tone: "error" };
  }
}

/** Statuses after which the person should be offered sign-in / registration. */
export function needsIdentity(status: CheckInStatus): boolean {
  return status === "auth_required" || status === "needs_registration" || status === "reauth_required";
}
