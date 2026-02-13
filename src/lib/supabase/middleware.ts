import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublicPage = pathname === "/";
  const isApiRoute = pathname.startsWith("/api");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isOnboarding = pathname.startsWith("/onboarding");

  // Helper: redirect with auth cookies preserved
  function redirectTo(path: string) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value);
    });
    return res;
  }

  // API routes and auth callback: always pass through
  if (isApiRoute || isAuthCallback) {
    return supabaseResponse;
  }

  // Public page (/): always pass through
  if (isPublicPage) {
    return supabaseResponse;
  }

  // ----- ONBOARDING: simple auth-only check, NO database queries -----
  if (isOnboarding) {
    if (!user) {
      return redirectTo("/login");
    }
    // Logged in → just pass through. The page handles everything client-side.
    return supabaseResponse;
  }

  // ----- NOT LOGGED IN -----
  if (!user) {
    // Auth pages: allow through
    if (isAuthPage) {
      return supabaseResponse;
    }
    // Everything else: redirect to login
    return redirectTo("/login");
  }

  // ----- LOGGED IN: check if user has completed onboarding -----
  // Single DB query used for both auth pages and protected routes
  let hasProfile = false;
  try {
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    hasProfile = !!profile?.tenant_id;
  } catch {
    // DB query failed — assume not onboarded
    hasProfile = false;
  }

  // Auth pages (login/register): redirect logged-in users to the right place
  if (isAuthPage) {
    return redirectTo(hasProfile ? "/dashboard" : "/onboarding");
  }

  // Protected routes: ensure user has completed onboarding
  if (!hasProfile) {
    return redirectTo("/onboarding");
  }

  return supabaseResponse;
}
