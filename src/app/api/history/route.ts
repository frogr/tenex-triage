import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/history — returns classification runs and sync events for the logged-in user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [classificationRuns, syncEvents] = await Promise.all([
    prisma.classificationRun.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    prisma.syncEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ classificationRuns, syncEvents });
}
