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

  // Helper: redirect while preserving ALL cookie data (name, value, AND options)
  function redirectTo(path: string) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      res.cookies.set(name, value, options);
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

  // Auth pages (login/register): ALWAYS allow through.
  // The pages handle logged-in state themselves via client-side checks.
  // This prevents redirect chains that cause white pages.
  if (isAuthPage) {
    return supabaseResponse;
  }

  // Onboarding: ALWAYS pass through. No auth check, no redirects.
  // The page handles all auth/redirect logic client-side to avoid
  // ERR_TOO_MANY_REDIRECTS caused by cookie propagation issues
  // between server-side middleware and client-side auth.
  if (isOnboarding) {
    return supabaseResponse;
  }

  // ----- ALL OTHER PROTECTED ROUTES -----
  if (!user) {
    return redirectTo("/login");
  }

  // Check if user has completed onboarding
  try {
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.tenant_id) {
      return redirectTo("/onboarding");
    }
  } catch {
    return redirectTo("/onboarding");
  }

  return supabaseResponse;
}
