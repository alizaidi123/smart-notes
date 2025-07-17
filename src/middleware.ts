import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
      secure: process.env.NODE_ENV === 'production', // Crucial for production HTTPS
      // Optional: Set domain if you have issues with subdomains or specific cookie scope.
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
    console.error("Supabase session error in middleware:", sessionError);
  }

  const isAuthRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/sign-up";

  if (isAuthRoute) {
    if (session) { // Check if user is logged in
      console.log("Middleware: User logged in, redirecting from auth route to /");
      return NextResponse.redirect(
        new URL("/", process.env.NEXT_PUBLIC_BASE_URL!),
      );
    }
  } else { // Only proceed with note fetching if not an auth route
    const { searchParams, pathname } = request.nextUrl;

    if (!searchParams.get("noteId") && pathname === "/") {
      if (session) { // Check if user is logged in
        try {
          console.log("Middleware: User has session, fetching newest note or creating one.");
          // Fetching newest note / creating new note
          const newestNoteResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/fetch-newest-note?userId=${session.user.id}`,
            {
                // Ensure your API route can handle auth implicitly or add Authorization header
                headers: {
                    'Authorization': `Bearer ${session.access_token}`, // Pass access token if API route needs it
                }
            }
          );

          if (!newestNoteResponse.ok) {
            const errorText = await newestNoteResponse.text();
            console.error("Middleware: Failed to fetch newest note:", newestNoteResponse.status, errorText);
            // If API fails, redirect to login or show error. For now, just return response.
            return NextResponse.redirect(new URL("/login", request.url)); // Redirect to login if API fails to fetch note
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
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/create-new-note?userId=${session.user.id}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  'Authorization': `Bearer ${session.access_token}`, // Pass access token if API route needs it
                },
              },
            );

            if (!createNoteResponse.ok) {
              const errorText = await createNoteResponse.text();
              console.error("Middleware: Failed to create new note:", createNoteResponse.status, errorText);
              return NextResponse.redirect(new URL("/login", request.url)); // Redirect to login if API fails to create note
            }

            const { noteId } = await createNoteResponse.json();
            const url = request.nextUrl.clone();
            url.searchParams.set("noteId", noteId);
            console.log("Middleware: Redirecting to / with newly created noteId:", noteId);
            return NextResponse.redirect(url);
          }
        } catch (fetchError) {
          console.error("Middleware: Error during note fetch/create in middleware:", fetchError);
          return NextResponse.redirect(new URL("/login", request.url)); // Catch any network errors
        }
      } else {
        // If no session and not on auth route, and trying to access root without noteId
        console.log("Middleware: No session, redirecting to login from root.");
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
  }

  // Ensure cookies are correctly set on the response before returning
  console.log("Middleware: Proceeding to next response.");
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
