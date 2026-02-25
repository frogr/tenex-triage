import { describe, it, expect } from "vitest";
import { buildSystemPrompt, formatThreadForPrompt, buildUserPrompt } from "./prompt";
import type { BucketDefinition, ClassificationInput } from "./types";

const BUCKETS: BucketDefinition[] = [
  { name: "Needs Action", description: "Emails requiring a response" },
  { name: "FYI", description: "Informational emails" },
];

const THREAD: ClassificationInput = {
  threadId: "thread-123",
  sender: "Alice <alice@example.com>",
  subject: "Quick question",
  snippet: "Hey, can you review this?",
  date: "2024-02-25T10:00:00Z",
};

describe("buildSystemPrompt", () => {
  it("includes all bucket names and descriptions", () => {
    const prompt = buildSystemPrompt(BUCKETS);
    expect(prompt).toContain('"Needs Action"');
    expect(prompt).toContain("Emails requiring a response");
    expect(prompt).toContain('"FYI"');
    expect(prompt).toContain("Informational emails");
  });

  it("includes classification instructions", () => {
    const prompt = buildSystemPrompt(BUCKETS);
    expect(prompt).toContain("exactly one bucket");
    expect(prompt).toContain("threadId");
    expect(prompt).toContain("confidence");
  });

  it("handles empty buckets array", () => {
    const prompt = buildSystemPrompt([]);
    expect(prompt).toContain("Available buckets:");
  });

  it("handles special characters in descriptions", () => {
    const prompt = buildSystemPrompt([
      { name: "Test & Debug", description: 'Emails with "quotes" & <brackets>' },
    ]);
    expect(prompt).toContain('"Test & Debug"');
    expect(prompt).toContain('"quotes"');
    expect(prompt).toContain("<brackets>");
  });
});

describe("formatThreadForPrompt", () => {
  it("formats a thread correctly", () => {
    const formatted = formatThreadForPrompt(THREAD);
    expect(formatted).toContain("Thread ID: thread-123");
    expect(formatted).toContain("From: Alice <alice@example.com>");
    expect(formatted).toContain("Subject: Quick question");
    expect(formatted).toContain("Preview: Hey, can you review this?");
    expect(formatted).toContain("Date: 2024-02-25T10:00:00Z");
    expect(formatted).toContain("---");
  });
});

describe("buildUserPrompt", () => {
  it("concatenates multiple threads", () => {
    const threads: ClassificationInput[] = [
      THREAD,
      { ...THREAD, threadId: "thread-456", subject: "Another email" },
    ];
    const prompt = buildUserPrompt(threads);
    expect(prompt).toContain("thread-123");
    expect(prompt).toContain("thread-456");
    expect(prompt).toContain("Another email");
  });

  it("handles empty array", () => {
    const prompt = buildUserPrompt([]);
    expect(prompt).toBe("");
  });
});
