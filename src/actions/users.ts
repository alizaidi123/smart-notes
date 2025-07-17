
"use server";

import { createClient } from "@/auth/server";
import { prisma } from "@/db/prisma";
import { handleError } from "@/lib/utils";

export const loginAction = async (email: string, password: string) => {
  try {
    const { auth } = await createClient();
    const { data, error } = await auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // After successful Supabase login, ensure user exists in our Prisma DB
    const user = data.user;
    if (user) {
      // Use upsert to find the user by their Supabase ID, or create them if they don't exist
      await prisma.user.upsert({
        where: { id: user.id }, // Try to find by Supabase user ID
        update: {
          // Update fields if user already exists (e.g., email might change)
          email: user.email!, // Use non-null assertion as email is guaranteed by Supabase auth
          updatedAt: new Date(), // Ensure updatedAt is updated
        },
        create: {
          // Create user if they don't exist in our DB
          id: user.id, // Use Supabase user ID
          email: user.email!, // Email is guaranteed by Supabase auth
          // createdAt and updatedAt will be handled by @default(now()) and @updatedAt in schema.prisma
        },
      });
    } else {
      // This case theoretically shouldn't happen after a successful signInWithPassword
      // but it's good practice to handle or log.
      console.error("Login successful but user data is missing.");
      throw new Error("User data missing after login.");
    }

    return { errorMessage: null };
  } catch (error) {
    return handleError(error);
  }
};

export const logOutAction = async () => {
  try {
    const { auth } = await createClient();
    const { error } = await auth.signOut({});
    if (error) throw error;

    return { errorMessage: null };
  } catch (error) {
    return handleError(error);
  }
};

export const signUpAction = async (email: string, password: string) => {
  try {
    const { auth } = await createClient();
    const { data, error } = await auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) throw new Error("Error signing up: User ID missing.");

    // This part was already correct for signup: create the user in the Prisma DB
    await prisma.user.create({
      data: {
        id: userId, // Ensure the Prisma user ID matches the Supabase user ID
        email,
      },
    });
    return { errorMessage: null };
  } catch (error) {
    return handleError(error);
  }
};
