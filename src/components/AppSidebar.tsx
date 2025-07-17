import { getUser } from "@/auth/server";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { prisma } from "@/db/prisma";
// Import PrismaClient type for type inference
import type { PrismaClient } from "@prisma/client";

// Define the Note type by inferring it from PrismaClient's 'note' model
// This is a robust way to get the exact generated type when direct 'import type { Note }' fails.
type NoteType = PrismaClient['note']['findMany'] extends (args: any) => Promise<infer U> ? U[number] : any;

import Link from "next/link";
// IMPORTANT: Ensure this path is correct for your project
// If SidebarGroupContent.tsx is in the same folder as AppSidebar.tsx, use "./SidebarGroupContent"
// If it's in a subfolder like 'AppSidebar', use "./AppSidebar/SidebarGroupContent"
import SidebarGroupContent from "./SidebarGroupContent"; // Reverted to original common path

async function AppSidebar() {
  const user = await getUser();

  // Use the newly defined NoteType
  let notes: NoteType[] = [];

  if (user) {
    notes = await prisma.note.findMany({
      where: {
        authorId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  return (
    <Sidebar>
      <SidebarContent className="custom-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 mt-2 text-lg">
            {user ? (
              "Your Notes"
            ) : (
              <p>
                <Link href="/Login" className="underline">
                  {" "}
                  Log in{" "}
                </Link>{" "}
                to see your notes
              </p>
            )}
          </SidebarGroupLabel>
          {user && <SidebarGroupContent notes={notes} />}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
