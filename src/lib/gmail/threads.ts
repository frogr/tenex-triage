import type { gmail_v1 } from "googleapis";
import type { GmailThread, GmailThreadResponse } from "./types";

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 200;

/**
 * Fetch thread IDs from Gmail (up to maxResults).
 */
export async function fetchThreadIds(
  gmail: gmail_v1.Gmail,
  maxResults: number = 200
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < maxResults) {
    const res = await gmail.users.threads.list({
      userId: "me",
      maxResults: Math.min(maxResults - ids.length, 100), // Gmail caps at 100 per page
      pageToken,
    });

    const threads = res.data.threads;
    if (!threads || threads.length === 0) break;

    for (const t of threads) {
      if (t.id) ids.push(t.id);
    }

    pageToken = res.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  return ids.slice(0, maxResults);
}

/**
 * Fetch full thread details in batches to avoid rate limits.
 * Calls onProgress after each batch completes.
 */
export async function fetchThreadDetails(
  gmail: gmail_v1.Gmail,
  threadIds: string[],
  onProgress?: (fetched: number, total: number) => void
): Promise<GmailThread[]> {
  const results: GmailThread[] = [];

  for (let i = 0; i < threadIds.length; i += BATCH_SIZE) {
    const batch = threadIds.slice(i, i + BATCH_SIZE);

    const settled = await Promise.allSettled(
      batch.map((id) =>
        gmail.users.threads.get({
          userId: "me",
          id,
          format: "metadata",
          metadataHeaders: ["From", "Subject"],
        })
      )
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        const parsed = parseThread(result.value.data as GmailThreadResponse);
        if (parsed) results.push(parsed);
      }
      // Skip failed individual thread fetches — don't kill the run
    }

    onProgress?.(Math.min(i + BATCH_SIZE, threadIds.length), threadIds.length);

    // Rate limit: wait between batches (skip after last batch)
    if (i + BATCH_SIZE < threadIds.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return results;
}

/**
 * Parse a raw Gmail thread response into our domain type.
 */
export function parseThread(raw: GmailThreadResponse): GmailThread | null {
  if (!raw.id || !raw.messages || raw.messages.length === 0) return null;

  const firstMessage = raw.messages[0];
  const headers = firstMessage.payload?.headers ?? [];

  const subjectHeader = headers.find((h) => h.name === "Subject");
  const fromHeader = headers.find((h) => h.name === "From");

  const subject = subjectHeader?.value ?? "(no subject)";
  const rawFrom = fromHeader?.value ?? "Unknown";
  const { name: sender, email: senderEmail } = parseFromHeader(rawFrom);

  const labels = firstMessage.labelIds ?? [];
  const isRead = !labels.includes("UNREAD");

  const internalDate = firstMessage.internalDate;
  const date = internalDate
    ? new Date(parseInt(internalDate, 10))
    : new Date();

  return {
    id: raw.id,
    subject,
    snippet: raw.snippet ?? "",
    sender,
    senderEmail,
    date,
    gmailLabels: labels,
    messageCount: raw.messages.length,
    isRead,
  };
}

/**
 * Parse a "From" header like "Austin French <austin@example.com>" into name + email.
 */
export function parseFromHeader(from: string): {
  name: string;
  email: string;
} {
  // "Display Name <email@example.com>"
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return {
      name: match[1].replace(/^["']|["']$/g, "").trim(),
      email: match[2].trim(),
    };
  }

  // Plain email
  if (from.includes("@")) {
    return { name: from.trim(), email: from.trim() };
  }

  return { name: from.trim(), email: "" };
}
