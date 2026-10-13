import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

// Refreshes the Supabase session on every request (rotating refresh tokens
// and re-writing the 12-month cookies) and gates /admin and /me.
// Fine-grained role checks happen in each admin page/action AND in the
// database; this is only the first, cheap gate.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const needsAuth = path.startsWith("/admin") || path.startsWith("/me") || path.startsWith("/print");

  // Visitors with no Supabase auth cookie have no session to refresh:
  // skip the auth round trip entirely and let public pages render at once.
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasAuthCookie) {
    if (!needsAuth) return response;
    return redirectToSignIn(request, path);
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims(): it refreshes
  // the session if needed, then verifies the JWT (locally when the project
  // uses asymmetric signing keys, so no extra trip to the Auth server).
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && needsAuth) return redirectToSignIn(request, path);

  return response;
}

function redirectToSignIn(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = "";
  url.searchParams.set("next", path + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
