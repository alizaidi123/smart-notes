import { getUser } from "@/auth/server";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { prisma } from "@/db/prisma";
// OPTION A: Import PrismaClient and infer the Note type
import type { PrismaClient } from "@prisma/client";
// OPTION B: (Less common but good to know) Sometimes types are in a subpath like this:
// import type { Note } from '@prisma/client/edge'; // or similar depending on your Prisma client generation setup

// Define the Note type based on the PrismaClient's Note model
// This is a robust way to get the exact generated type for your 'Note' model
type NoteType = PrismaClient['note']['findMany'] extends (args: any) => Promise<infer U> ? U[number] : any;


import Link from "next/link";
import SidebarGroupContent from "./AppSidebar/SidebarGroupContent"; // Corrected path assumption if needed

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
