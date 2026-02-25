import { describe, it, expect } from "vitest";
import { parseThread, parseFromHeader } from "./threads";
import type { GmailThreadResponse } from "./types";

describe("parseFromHeader", () => {
  it("parses 'Name <email>' format", () => {
    const result = parseFromHeader("Austin French <austin@example.com>");
    expect(result).toEqual({
      name: "Austin French",
      email: "austin@example.com",
    });
  });

  it("parses quoted name format", () => {
    const result = parseFromHeader('"John Doe" <john@example.com>');
    expect(result).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  it("parses single-quoted name format", () => {
    const result = parseFromHeader("'Jane Doe' <jane@example.com>");
    expect(result).toEqual({ name: "Jane Doe", email: "jane@example.com" });
  });

  it("parses plain email", () => {
    const result = parseFromHeader("noreply@github.com");
    expect(result).toEqual({
      name: "noreply@github.com",
      email: "noreply@github.com",
    });
  });

  it("handles name with no email", () => {
    const result = parseFromHeader("Some Sender");
    expect(result).toEqual({ name: "Some Sender", email: "" });
  });

  it("handles empty string", () => {
    const result = parseFromHeader("");
    expect(result).toEqual({ name: "", email: "" });
  });
});

describe("parseThread", () => {
  function makeThread(overrides?: Partial<GmailThreadResponse>): GmailThreadResponse {
    return {
      id: "thread-1",
      snippet: "Hey, just checking in...",
      messages: [
        {
          id: "msg-1",
          labelIds: ["INBOX", "UNREAD"],
          internalDate: "1708900000000",
          payload: {
            headers: [
              { name: "Subject", value: "Quick question" },
              { name: "From", value: "Alice <alice@example.com>" },
            ],
          },
        },
        {
          id: "msg-2",
          labelIds: ["INBOX"],
          internalDate: "1708901000000",
          payload: {
            headers: [
              { name: "Subject", value: "Re: Quick question" },
              { name: "From", value: "Bob <bob@example.com>" },
            ],
          },
        },
      ],
      ...overrides,
    };
  }

  it("parses a well-formed thread", () => {
    const result = parseThread(makeThread());
    expect(result).not.toBeNull();
    expect(result!.id).toBe("thread-1");
    expect(result!.subject).toBe("Quick question");
    expect(result!.sender).toBe("Alice");
    expect(result!.senderEmail).toBe("alice@example.com");
    expect(result!.snippet).toBe("Hey, just checking in...");
    expect(result!.messageCount).toBe(2);
    expect(result!.isRead).toBe(false); // has UNREAD label
    expect(result!.gmailLabels).toEqual(["INBOX", "UNREAD"]);
  });

  it("returns null for thread with no id", () => {
    const result = parseThread({ id: "", messages: [{ id: "m1" }] });
    expect(result).toBeNull();
  });

  it("returns null for thread with no messages", () => {
    const result = parseThread({ id: "t1", messages: [] });
    expect(result).toBeNull();
  });

  it("returns null for thread with undefined messages", () => {
    const result = parseThread({ id: "t1" });
    expect(result).toBeNull();
  });

  it("handles missing subject header", () => {
    const result = parseThread(
      makeThread({
        messages: [
          {
            id: "msg-1",
            labelIds: ["INBOX"],
            internalDate: "1708900000000",
            payload: {
              headers: [
                { name: "From", value: "alice@example.com" },
              ],
            },
          },
        ],
      })
    );
    expect(result!.subject).toBe("(no subject)");
  });

  it("handles missing From header", () => {
    const result = parseThread(
      makeThread({
        messages: [
          {
            id: "msg-1",
            labelIds: ["INBOX"],
            internalDate: "1708900000000",
            payload: {
              headers: [{ name: "Subject", value: "Test" }],
            },
          },
        ],
      })
    );
    expect(result!.sender).toBe("Unknown");
  });

  it("treats thread without UNREAD label as read", () => {
    const result = parseThread(
      makeThread({
        messages: [
          {
            id: "msg-1",
            labelIds: ["INBOX"],
            internalDate: "1708900000000",
            payload: {
              headers: [
                { name: "Subject", value: "Read email" },
                { name: "From", value: "bob@example.com" },
              ],
            },
          },
        ],
      })
    );
    expect(result!.isRead).toBe(true);
  });

  it("handles missing payload/headers gracefully", () => {
    const result = parseThread(
      makeThread({
        messages: [{ id: "msg-1", labelIds: ["INBOX"], internalDate: "1708900000000" }],
      })
    );
    expect(result).not.toBeNull();
    expect(result!.subject).toBe("(no subject)");
    expect(result!.sender).toBe("Unknown");
  });
});
