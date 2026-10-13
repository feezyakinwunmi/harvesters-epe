// Auth cookies persist for up to 12 months on a trusted device. Supabase
// keeps the session alive by rotating refresh tokens; the database caps a
// session's age at 365 days (private.session_is_trusted) and admins can
// revoke sessions at any time.
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const authCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: AUTH_COOKIE_MAX_AGE,
};
