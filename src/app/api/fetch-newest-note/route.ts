import { prisma } from "@/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/auth/server"; // Import your server client utility

export async function GET(request: NextRequest) {
  try {
    // Authenticate user directly in the API route
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("API /fetch-newest-note: User not authenticated or session error.", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // The user should already be synced to Prisma DB via getUser() in src/auth/server.ts

    const newestNote = await prisma.note.findFirst({
      where: { authorId: user.id }, // Use the user.id from the session
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (newestNote) {
      return NextResponse.json({ newestNoteId: newestNote.id });
    } else {
      return NextResponse.json({ newestNoteId: null });
    }
  } catch (error) {
    console.error("API /fetch-newest-note error:", error);
    return NextResponse.json({ error: "Failed to fetch newest note" }, { status: 500 });
  }
}
