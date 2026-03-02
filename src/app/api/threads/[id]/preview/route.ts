import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGmailClient } from "@/lib/gmail/client";

/**
 * GET /api/threads/[id]/preview — fetch the first message body from Gmail.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify thread belongs to user
  const thread = await prisma.emailThread.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  try {
    const gmail = await getGmailClient(session.user.id);
    const res = await gmail.users.threads.get({
      userId: "me",
      id,
      format: "full",
    });

    const messages = res.data.messages ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ body: "", messages: [] });
    }

    const parsed = messages.map((msg) => {
      const headers = msg.payload?.headers ?? [];
      const from = headers.find((h) => h.name === "From")?.value ?? "Unknown";
      const date = msg.internalDate
        ? new Date(parseInt(msg.internalDate, 10)).toISOString()
        : null;

      const body = extractBody(msg.payload);

      return { from, date, body };
    });

    return NextResponse.json({ messages: parsed });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch thread preview" },
      { status: 500 }
    );
  }
}

/**
 * Extract plain text or HTML body from a Gmail message payload.
 * Prefers text/plain, falls back to text/html (stripped of tags).
 */
function extractBody(
  payload: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null } | undefined | null
): string {
  if (!payload) return "";

  // Simple body (no parts)
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    if (payload.mimeType === "text/plain") return decoded;
    if (payload.mimeType === "text/html") return stripHtml(decoded);
  }

  // Multipart — recurse
  if (payload.parts && Array.isArray(payload.parts)) {
    // Prefer text/plain
    for (const part of payload.parts) {
      const p = part as { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null };
      if (p.mimeType === "text/plain" && p.body?.data) {
        return Buffer.from(p.body.data, "base64url").toString("utf-8");
      }
    }
    // Fall back to text/html
    for (const part of payload.parts) {
      const p = part as { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null };
      if (p.mimeType === "text/html" && p.body?.data) {
        return stripHtml(Buffer.from(p.body.data, "base64url").toString("utf-8"));
      }
    }
    // Recurse into nested multipart
    for (const part of payload.parts) {
      const p = part as { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] | null };
      const result = extractBody(p);
      if (result) return result;
    }
  }

  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
