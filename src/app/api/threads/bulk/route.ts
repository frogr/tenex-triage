import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/threads/bulk — move multiple threads to a bucket (user override).
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { threadIds, bucketId } = body;

  if (!Array.isArray(threadIds) || threadIds.length === 0 || !bucketId) {
    return NextResponse.json(
      { error: "threadIds (array) and bucketId are required" },
      { status: 400 }
    );
  }

  const updated = await prisma.emailThread.updateMany({
    where: {
      id: { in: threadIds },
      userId: session.user.id,
    },
    data: { bucketId, userOverride: true },
  });

  return NextResponse.json({ moved: updated.count });
}
