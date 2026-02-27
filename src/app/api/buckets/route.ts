import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buckets = await prisma.bucket.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { threads: true } } },
  });

  return NextResponse.json(buckets);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name || !description) {
    return NextResponse.json(
      { error: "name and description are required" },
      { status: 400 }
    );
  }

  // Get max sort order for this user
  const maxSort = await prisma.bucket.aggregate({
    where: { userId: session.user.id },
    _max: { sortOrder: true },
  });

  const bucket = await prisma.bucket.create({
    data: {
      name,
      description,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      userId: session.user.id,
    },
  });

  return NextResponse.json(bucket, { status: 201 });
}
