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

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

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

  // Allow auth callbacks and API routes through
  if (isApiRoute || isAuthCallback) {
    return supabaseResponse;
  }

  // Helper: create a redirect that preserves Supabase auth cookies.
  // Without this, token refreshes done by getUser() are lost on redirect,
  // which can cause the user to be logged out on the next request.
  function redirectTo(path: string) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const redirectResponse = NextResponse.redirect(url);
    // Copy all cookies from supabaseResponse (including refreshed tokens)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // Not logged in: redirect to login (except public/auth pages and onboarding)
  if (!user && !isAuthPage && !isPublicPage && !isOnboarding) {
    return redirectTo("/login");
  }

  // Not logged in on onboarding: redirect to login
  if (!user && isOnboarding) {
    return redirectTo("/login");
  }

  // Logged in: redirect away from auth pages
  if (user && isAuthPage) {
    return redirectTo("/dashboard");
  }

  // Logged in: check if user has a tenant (needs onboarding)
  if (user && !isOnboarding && !isAuthPage && !isPublicPage) {
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // User exists in auth but not in users table — needs onboarding
      return redirectTo("/onboarding");
    }
  }

  // On onboarding page but already has a tenant — redirect to dashboard
  if (user && isOnboarding) {
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profile?.tenant_id) {
      return redirectTo("/dashboard");
    }
  }

  return supabaseResponse;
}
