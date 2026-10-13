// Central place for environment variables. Public values are inlined by
// Next.js at build time; server values are read lazily so a missing secret
// fails loudly at the point of use rather than at import time.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

export const publicEnv = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://harvesters-epe.vercel.app").replace(/\/+$/, ""),
  smsOtpEnabled: process.env.NEXT_PUBLIC_SMS_OTP_ENABLED === "true",
};

export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/church-public-media/${clean}`;
}
