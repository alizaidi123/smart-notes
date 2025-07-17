
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = cookies() // No need for await here

  const client = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                // Ensure secure is true in production for HTTPS
                secure: process.env.NODE_ENV === 'production',
                // Optional: Set domain if you have issues with subdomains or specific cookie scope.
                // For Vercel's default domains (e.g., smart-notes-u7gh.vercel.app), this is usually not needed,
                // but can be added if you use custom domains and have issues.
                // domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
              })
            )
          } catch (error) {
            // The `cookies().set()` method can throw if used in a Server Component
            // or Server Action that has a `redirect()` call in it.
            // This is expected and usually harmless. Log it for debugging if needed.
            console.warn("Cookie set failed in createServerClient:", error);
          }
        },
      },
      // You can also add top-level cookie options here, which will be merged with individual cookie options
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        // domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
        sameSite: 'Lax', // Recommended for most use cases
      }
    }
  )
  return client
}

export async function getUser(){
    const {auth} = await createClient()

    const userObject = await auth.getUser()

    if (userObject.error) {
        console.error("Error fetching user session in getUser:", userObject.error)
        return null
    }

    return userObject.data.user
}
