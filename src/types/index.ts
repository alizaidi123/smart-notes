import type { PrismaClient } from "@prisma/client";


export type NoteType = Awaited<ReturnType<PrismaClient['note']['findMany']>>[number];
