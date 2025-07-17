import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"; // <--- Use this for middleware
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // We need to create a response object for the middleware client to set cookies
  const response = NextResponse.next({
    request,
  });

  const supabase = createMiddlewareClient({
    supabaseUrl: process.env.SUPABASE_URL, // Pass directly
    supabaseKey: process.env.SUPABASE_ANON_KEY, // Pass directly
    req: request,
    res: response, // Pass the response object
  });

  // This will refresh the user's session and update the cookies if needed
  // It's crucial for authentication state in middleware
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  // Basic error logging for debugging (optional, but recommended during dev)
  if (sessionError) {
    console.error("Supabase session error in middleware:", sessionError);
  }

  const isAuthRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/sign-up";

  if (isAuthRoute) {
    if (session) { // Check if user is logged in
      return NextResponse.redirect(
        new URL("/", process.env.NEXT_PUBLIC_BASE_URL!), // Use ! for non-null assertion
      );
    }
  } else { // Only proceed with note fetching if not an auth route
    const { searchParams, pathname } = request.nextUrl; // Use request.nextUrl directly

    if (!searchParams.get("noteId") && pathname === "/") {
      if (session) { // Check if user is logged in
        // Fetching newest note / creating new note
        // Ensure these API routes are serverless functions accessible via NEXT_PUBLIC_BASE_URL
        try {
          const newestNoteResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/fetch-newest-note?userId=${session.user.id}`,
            {
              // Middleware does not have access to cookies or headers like a server component.
              // If your API route requires auth, you might need to pass an auth header here,
              // or ensure your API route can handle auth from server-side calls.
              // For a simple middleware, it often makes sense for the API route to be public
              // if it's only fetching public data, or handle authentication differently.
            }
          );

          if (!newestNoteResponse.ok) {
            console.error("Failed to fetch newest note:", await newestNoteResponse.text());
            // Potentially redirect to a generic error page or login
            return response; // Return current response without redirect
          }

          const { newestNoteId } = await newestNoteResponse.json();

          if (newestNoteId) {
            const url = request.nextUrl.clone();
            url.searchParams.set("noteId", newestNoteId);
            return NextResponse.redirect(url);
          } else {
            const createNoteResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/create-new-note?userId=${session.user.id}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  // Potentially Authorization: `Bearer ${session.access_token}` if your API route requires it
                },
              },
            );

            if (!createNoteResponse.ok) {
              console.error("Failed to create new note:", await createNoteResponse.text());
              return response; // Return current response without redirect
            }

            const { noteId } = await createNoteResponse.json();
            const url = request.nextUrl.clone();
            url.searchParams.set("noteId", noteId);
            return NextResponse.redirect(url);
          }
        } catch (fetchError) {
          console.error("Error during note fetch/create in middleware:", fetchError);
          // Handle the error gracefully, perhaps redirect to login or an error page
          return response; // Return current response
        }
      } else {
        // If no session and not on auth route, and trying to access root without noteId
        // Redirect to login page
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
  }

  // Ensure cookies are correctly set on the response before returning
  return response;
}

export const config = {
  // Update matcher to specifically include/exclude paths for middleware
  // Adjust this based on your routing needs
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /api/ (your API routes, if they don't need middleware auth)
     * - anything in public folder (e.g. .svg, .png, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
