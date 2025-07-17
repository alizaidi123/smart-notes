// src/app/api/fetch-newest-note/route.ts
import { prisma } from "@/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/auth/server"; // Import your server client utility

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient(); // Use createClient to get session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("API /fetch-newest-note: User not authenticated.", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newestNote = await prisma.note.findFirst({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true }, // Only need the ID here
    });

    if (newestNote) {
      return NextResponse.json({ newestNoteId: newestNote.id });
    } else {
      return NextResponse.json({ newestNoteId: null }); // No note found
    }
  } catch (error) {
    console.error("API /fetch-newest-note error:", error);
    return NextResponse.json({ error: "Failed to fetch newest note" }, { status: 500 });
  }
}
