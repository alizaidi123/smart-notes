
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from "@/db/prisma"; // Import Prisma client

export async function createClient() {
  const cookieStore = cookies();

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
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
              })
            )
          } catch (error) {
            console.warn("Cookie set failed in createServerClient:", error);
          }
        },
      },
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
      }
    }
  )
  return client
}

export async function getUser(){
    const supabase = await createClient(); // Get the Supabase client

    const { data: { user }, error: userError } = await supabase.auth.getUser(); // Get the Supabase user

    if (userError) {
        console.error("Error fetching user session in getUser:", userError);
        return null;
    }

    if (user) {
        // --- THIS IS THE CRITICAL ADDITION ---
        // Upsert the user into your Prisma database every time their session is fetched
        // This guarantees the User record exists for foreign key constraints.
        try {
            await prisma.user.upsert({
                where: { id: user.id },
                update: {
                    email: user.email!, // Update email if it changed
                    updatedAt: new Date(),
                },
                create: {
                    id: user.id,
                    email: user.email!,
                },
            });
            console.log(`User synced to Prisma DB: ${user.id}`);
        } catch (prismaError) {
            console.error("Failed to upsert user into Prisma DB:", prismaError);
            // Optionally, you might want to return null or throw if DB sync is critical
            // For now, we'll let the user proceed with Supabase auth but log the DB issue.
        }
    }

    return user; // Return the Supabase user object
}
