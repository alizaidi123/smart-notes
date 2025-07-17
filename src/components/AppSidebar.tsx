import { getUser } from "@/auth/server";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"; 
import { prisma } from "@/db/prisma";
type NoteType = Awaited<ReturnType<typeof prisma.note.findMany>>[number];
import Link from "next/link";
import SidebarGroupContent from "./SidebarGroupContent";
async function AppSidebar() {
  const user = await getUser();

  // Use the inferred 'NoteType' for the notes array
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
