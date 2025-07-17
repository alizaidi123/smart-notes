import { prisma } from "@/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/auth/server"; // Import your server client utility
import { v4 as uuidv4 } from 'uuid'; // Import uuid generator

export async function POST(request: NextRequest) {
  try {
    // Authenticate user directly in the API route
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("API /create-new-note: User not authenticated or session error.", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // The user should already be synced to Prisma DB via getUser() in src/auth/server.ts

    // Generate a new UUID for the note
    const newNoteId = uuidv4();

    const { id } = await prisma.note.create({
      data: {
        id: newNoteId,
        authorId: user.id, // Use the user.id from the session
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
