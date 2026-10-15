import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath } from "./routes";

/** Supabase auth cookies are `sb-<project>-auth-token`, possibly chunked as `.0`, `.1`. */
const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => AUTH_COOKIE.test(cookie.name));
}

function redirectHome(request: NextRequest, from?: NextResponse) {
  const redirect = NextResponse.redirect(new URL("/", request.url));
  from?.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

// Refreshes the Supabase session cookies and redirects signed-out users away
// from protected routes.
//
// A request with no auth cookie is signed out by definition, so it never
// touches the network: public pages are served at once, and protected paths
// redirect. Requests that do carry a session use getClaims(), which verifies
// the JWT locally (cached signing keys) and refreshes the cookies when the
// token is about to expire. Pages and actions that authorize access or read
// private files still call getUser() themselves.
export async function updateSession(request: NextRequest) {
  if (!hasAuthCookie(request)) {
    return isProtectedPath(request.nextUrl.pathname)
      ? redirectHome(request)
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && isProtectedPath(request.nextUrl.pathname)) {
    return redirectHome(request, response);
  }

  return response;
}
