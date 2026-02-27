import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/threads/[id] — move a thread to a different bucket (user override).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { bucketId } = body;

  if (!bucketId) {
    return NextResponse.json({ error: "bucketId is required" }, { status: 400 });
  }

  // Verify thread belongs to user
  const thread = await prisma.emailThread.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const updated = await prisma.emailThread.update({
    where: { id },
    data: { bucketId, userOverride: true },
    include: { bucket: true },
  });

  return NextResponse.json(updated);
}
