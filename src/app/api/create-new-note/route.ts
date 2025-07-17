
import { prisma } from "@/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/auth/server"; // Import your server client utility

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient(); // Use createClient to get session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("API /create-new-note: User not authenticated.", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure the user exists in Prisma DB before creating a note for them
    // This is a safety net for edge cases where loginAction might not have completed or wasn't used.
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

    // Get noteId from request body if it's passed, otherwise generate new UUID
    // Assuming your middleware might be trying to pass a pre-generated ID sometimes.
    const { searchParams } = new URL(request.url);
    const preGeneratedNoteId = searchParams.get("noteId"); // Middleware might pass this
    const newNoteId = preGeneratedNoteId || require('uuid').v4(); // Or use `crypto.randomUUID()` in Node.js 16+ or a simpler approach

    const { id } = await prisma.note.create({
      data: {
        id: newNoteId, // Use the pre-generated or newly generated ID
        authorId: user.id,
        text: "",
      },
    });

    return NextResponse.json({
      noteId: id,
    });
  } catch (error) {
    console.error("API /create-new-note error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
