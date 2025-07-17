import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    // We need to create a response object for the middleware client to set cookies
    const response = NextResponse.next({
      request,
    });

    // Initialize Supabase client for the middleware
    const supabase = createMiddlewareClient({
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_ANON_KEY!,
      req: request,
      res: response, // Pass the response object for cookie handling
      cookieOptions: { // Add cookieOptions for robustness in production
        // Ensure secure is true in production for HTTPS
        secure: process.env.NODE_ENV === 'production',
        // Optional: Set domain if you have issues with subdomains or specific cookie scope.
        // For Vercel's default domains (e.g., your-project.vercel.app), this is usually not needed,
        // but can be added if you use custom domains and have issues (e.g., domain: '.yourdomain.com').
        // domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
        sameSite: 'Lax', // Recommended for most use cases
      },
    });

    // Refresh the user's session and update the cookies if needed.
    // This is crucial for authentication state in middleware.
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    // Basic error logging for debugging (optional, but highly recommended during development)
    if (sessionError) {
      console.error("Middleware: Supabase session error:", sessionError);
    }

    // Log current and expected base URLs for debugging purposes
    console.log("Middleware URL (request.url):", request.url);
    console.log("NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL);


    const isAuthRoute =
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/sign-up";

    if (isAuthRoute) {
      if (session) { // If user is logged in and trying to access auth routes, redirect to home
        console.log("Middleware: User has session, redirecting from auth route to /");
        return NextResponse.redirect(
          new URL("/", process.env.NEXT_PUBLIC_BASE_URL!),
        );
      }
    } else { // Handle routes that are not auth routes
      const { searchParams, pathname } = request.nextUrl;

      // Logic to fetch or create a note only applies to the root path ("/")
      // and only if a noteId isn't already present in the URL.
      if (!searchParams.get("noteId") && pathname === "/") {
        if (session) { // Check if user has an active session
          try {
            console.log("Middleware: User has session, attempting to fetch or create a note.");

            // Attempt to fetch the newest note for the user
            const newestNoteResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/fetch-newest-note`,
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
              // If API fails (e.g., due to an internal error), redirect to login
              return NextResponse.redirect(new URL("/login", request.url));
            }

            const { newestNoteId } = await newestNoteResponse.json();

            if (newestNoteId) {
              // If a newest note is found, redirect to the home page with the noteId
              const url = request.nextUrl.clone();
              url.searchParams.set("noteId", newestNoteId);
              console.log("Middleware: Redirecting to / with newestNoteId:", newestNoteId);
              return NextResponse.redirect(url);
            } else {
              // If no newest note found, create a new one
              console.log("Middleware: No newest note found, creating a new one.");
              const createNoteResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/create-new-note`,
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
          // If no session and trying to access the root path without a noteId, redirect to login
          console.log("Middleware: No session, redirecting to login from root path.");
          return NextResponse.redirect(new URL("/login", request.url));
        }
      }
    }

    // If no specific redirect conditions are met, proceed with the original response
    console.log("Middleware: Proceeding to next response (no redirects from middleware logic).");
    return response;
  } catch (globalError) {
    // This is a catch-all for any unexpected errors during middleware execution
    console.error("Middleware: Unhandled error in middleware execution:", globalError);
    // As a fallback, redirect to login or a generic error page
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Configuration for which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - /api (API routes) - These are explicitly excluded from middleware processing
     * - /_next/static (static files like CSS, JS bundles)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     * - Any files in the public folder (e.g., .svg, .png, etc. - matching common image extensions)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
