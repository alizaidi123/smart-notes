// middleware.ts

import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    // We need to create a response object for the middleware client to set cookies
    const response = NextResponse.next({
      request,
    });

    const supabase = createMiddlewareClient({
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_ANON_KEY!,
      req: request,
      res: response, // Pass the response object
      cookieOptions: { // Add cookieOptions here for middleware
        // Ensure secure is true in production for HTTPS
        secure: process.env.NODE_ENV === 'production',
        // Optional: Set domain if you have issues with subdomains or specific cookie scope.
        // For Vercel's default domains (e.g., your-project.vercel.app), this is usually not needed,
        // but can be added if you use custom domains and have issues (e.g., domain: '.yourdomain.com').
        // domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
        sameSite: 'Lax', // Recommended for most use cases
      },
    });

    // This will refresh the user's session and update the cookies if needed
    // It's crucial for authentication state in middleware
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    // Basic error logging for debugging (optional, but recommended during dev)
    if (sessionError) {
      console.error("Middleware: Supabase session error:", sessionError);
    }

    const isAuthRoute =
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/sign-up";

    if (isAuthRoute) {
      if (session) { // Check if user is logged in
        console.log("Middleware: User has session, redirecting from auth route to /");
        return NextResponse.redirect(
          new URL("/", process.env.NEXT_PUBLIC_BASE_URL!),
        );
      }
    } else { // Only proceed with note fetching if not an auth route
      const { searchParams, pathname } = request.nextUrl;

      // Only attempt to fetch/create note if on the root path and no noteId is present
      if (!searchParams.get("noteId") && pathname === "/") {
        if (session) { // Check if user has an active session
          try {
            console.log("Middleware: User has session, attempting to fetch or create a note.");
            // Fetching newest note
            const newestNoteResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/fetch-newest-note`, // userId should be handled internally by the API route
              {
                  headers: {
                      // Pass the Authorization header if your API route uses it to get the session
                      'Authorization': `Bearer ${session.access_token}`,
                  },
              }
            );

            if (!newestNoteResponse.ok) {
              const errorText = await newestNoteResponse.text();
              console.error("Middleware: Failed to fetch newest note API response:", newestNoteResponse.status, errorText);
              // If API fails, redirect to login or show error.
              return NextResponse.redirect(new URL("/login", request.url));
            }

            const { newestNoteId } = await newestNoteResponse.json();

            if (newestNoteId) {
              const url = request.nextUrl.clone();
              url.searchParams.set("noteId", newestNoteId);
              console.log("Middleware: Redirecting to / with newestNoteId:", newestNoteId);
              return NextResponse.redirect(url);
            } else {
              console.log("Middleware: No newest note found, creating a new one.");
              const createNoteResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/create-new-note`, // userId should be handled internally by the API route
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    // Pass the Authorization header if your API route uses it to get the session
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                },
              );

              if (!createNoteResponse.ok) {
                const errorText = await createNoteResponse.text();
                console.error("Middleware: Failed to create new note API response:", createNoteResponse.status, errorText);
                return NextResponse.redirect(new URL("/login", request.url));
              }

              const { noteId } = await createNoteResponse.json();
              const url = request.nextUrl.clone();
              url.searchParams.set("noteId", noteId);
              console.log("Middleware: Redirecting to / with newly created noteId:", noteId);
              return NextResponse.redirect(url);
            }
          } catch (fetchError) {
            console.error("Middleware: Error during note fetch/create API call:", fetchError);
            // Catch any network errors during fetch calls
            return NextResponse.redirect(new URL("/login", request.url));
          }
        } else {
          // If no session and not on auth route, and trying to access root without noteId
          console.log("Middleware: No session, redirecting to login from root path.");
          return NextResponse.redirect(new URL("/login", request.url));
        }
      }
    }

    // Ensure cookies are correctly set on the response before returning
    console.log("Middleware: Proceeding to next response (no redirects from middleware).");
    return response;
  } catch (globalError) {
    console.error("Middleware: Unhandled error in middleware execution:", globalError);
    // This is a last-resort catch-all. Redirect to login or a generic error page.
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Config for which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any files in the public folder (e.g., .svg, .png, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
