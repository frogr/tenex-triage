import type { BucketDefinition, ClassificationInput } from "./types";

export function buildSystemPrompt(buckets: BucketDefinition[]): string {
  const bucketList = buckets
    .map((b) => `- "${b.name}": ${b.description}`)
    .join("\n");

  return `You are an expert email classifier. Your job is to categorize email threads into exactly one bucket based on their subject line, preview snippet, and sender.

Available buckets:
${bucketList}

Rules:
- Every thread MUST be assigned to exactly one bucket
- Choose the MOST specific matching bucket
- If uncertain between two buckets, prefer the more actionable one
- Return a confidence score from 0.0 to 1.0 for each classification

Respond with a JSON array. Each element must have:
- "threadId": the exact thread ID provided
- "bucket": the exact bucket name (must match one from the list above)
- "confidence": a number from 0.0 to 1.0`;
}

export function formatThreadForPrompt(thread: ClassificationInput): string {
  return `Thread ID: ${thread.threadId}
From: ${thread.sender}
Subject: ${thread.subject}
Preview: ${thread.snippet}
Date: ${thread.date}
---`;
}

export function buildUserPrompt(threads: ClassificationInput[]): string {
  return threads.map(formatThreadForPrompt).join("\n");
}
