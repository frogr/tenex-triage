import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runClassificationPipeline } from "@/lib/classifier/pipeline";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const runId = await runClassificationPipeline(session.user.id);
    return NextResponse.json({ runId });
  } catch (error) {
    console.error("Classification error:", error);
    const message =
      error instanceof Error ? error.message : "Classification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
