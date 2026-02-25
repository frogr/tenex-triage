import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailClient } from "@/lib/gmail/client";
import { fetchThreadIds, fetchThreadDetails } from "@/lib/gmail/threads";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const gmail = await getGmailClient(userId);

    const threadIds = await fetchThreadIds(gmail, 200);
    if (threadIds.length === 0) {
      return NextResponse.json({ threads: [], synced: 0 });
    }

    const threads = await fetchThreadDetails(gmail, threadIds);

    // Upsert all threads to the database
    let synced = 0;
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

    // Return threads from DB (includes bucket assignments if any)
    const dbThreads = await prisma.emailThread.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: { bucket: true },
    });

    return NextResponse.json({ threads: dbThreads, synced });
  } catch (error) {
    console.error("Gmail sync error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to sync Gmail threads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
