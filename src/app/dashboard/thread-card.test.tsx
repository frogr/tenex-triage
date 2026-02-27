import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ThreadCard } from "./thread-card";

const BUCKETS = [
  { id: "b1", name: "Needs Action" },
  { id: "b2", name: "FYI" },
];

function makeThread(overrides = {}) {
  return {
    id: "t1",
    subject: "Quarterly Report",
    snippet: "Please review the attached report...",
    sender: "Alice Johnson",
    date: new Date().toISOString(),
    messageCount: 3,
    isRead: false,
    confidence: 0.95,
    bucketId: "b1",
    bucket: { id: "b1", name: "Needs Action" },
    ...overrides,
  };
}

describe("ThreadCard", () => {
  it("renders sender, subject, and snippet", () => {
    render(
      <ThreadCard thread={makeThread()} buckets={BUCKETS} onMove={() => {}} />
    );

    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Quarterly Report")).toBeInTheDocument();
    expect(
      screen.getByText("Please review the attached report...")
    ).toBeInTheDocument();
  });

  it("shows message count when > 1", () => {
    render(
      <ThreadCard thread={makeThread()} buckets={BUCKETS} onMove={() => {}} />
    );
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("hides message count when 1", () => {
    render(
      <ThreadCard
        thread={makeThread({ messageCount: 1 })}
        buckets={BUCKETS}
        onMove={() => {}}
      />
    );
    expect(screen.queryByText("(1)")).not.toBeInTheDocument();
  });

  it("shows bucket label", () => {
    render(
      <ThreadCard thread={makeThread()} buckets={BUCKETS} onMove={() => {}} />
    );
    expect(screen.getByText("Needs Action")).toBeInTheDocument();
  });

  it("shows low confidence indicator", () => {
    render(
      <ThreadCard
        thread={makeThread({ confidence: 0.5 })}
        buckets={BUCKETS}
        onMove={() => {}}
      />
    );
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("hides confidence indicator when confidence is high", () => {
    render(
      <ThreadCard
        thread={makeThread({ confidence: 0.9 })}
        buckets={BUCKETS}
        onMove={() => {}}
      />
    );
    expect(screen.queryByText("?")).not.toBeInTheDocument();
  });

  it("applies bold styling for unread threads", () => {
    render(
      <ThreadCard
        thread={makeThread({ isRead: false })}
        buckets={BUCKETS}
        onMove={() => {}}
      />
    );
    const sender = screen.getByText("Alice Johnson");
    expect(sender.className).toContain("font-semibold");
  });
});
