import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailClient } from "@/lib/gmail/client";
import { fetchThreadIds, fetchThreadDetails } from "@/lib/gmail/threads";

/**
 * GET /api/threads — returns threads from the database.
 * Add ?sync=true to fetch fresh data from Gmail first.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const shouldSync = request.nextUrl.searchParams.get("sync") === "true";

  try {
    let synced: number | null = null;

    if (shouldSync) {
      const gmail = await getGmailClient(userId);
      const threadIds = await fetchThreadIds(gmail, 200);

      if (threadIds.length > 0) {
        const threads = await fetchThreadDetails(gmail, threadIds);
        synced = 0;
        for (const thread of threads) {
          await prisma.emailThread.upsert({
            where: { id: thread.id },
            create: {
              id: thread.id,
              userId,
              subject: thread.subject,
              snippet: thread.snippet,
              sender: thread.sender,
              senderEmail: thread.senderEmail,
              date: thread.date,
              gmailLabels: thread.gmailLabels,
              messageCount: thread.messageCount,
              isRead: thread.isRead,
            },
            update: {
              subject: thread.subject,
              snippet: thread.snippet,
              sender: thread.sender,
              senderEmail: thread.senderEmail,
              date: thread.date,
              gmailLabels: thread.gmailLabels,
              messageCount: thread.messageCount,
              isRead: thread.isRead,
            },
          });
          synced++;
        }
      }
    }

    const dbThreads = await prisma.emailThread.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: { bucket: true },
    });

    return NextResponse.json({ threads: dbThreads, synced });
  } catch (error) {
    console.error("Threads error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch threads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
