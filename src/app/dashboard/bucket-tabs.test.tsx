import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BucketTabs } from "./bucket-tabs";

const BUCKETS = [
  { id: "b1", name: "Needs Action", _count: { threads: 12 } },
  { id: "b2", name: "FYI", _count: { threads: 5 } },
  { id: "b3", name: "Newsletters", _count: { threads: 30 } },
];

describe("BucketTabs", () => {
  it("renders All tab and all bucket tabs", () => {
    render(
      <BucketTabs
        buckets={BUCKETS}
        activeBucket={null}
        onSelect={() => {}}
        totalThreads={47}
      />
    );

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Needs Action")).toBeInTheDocument();
    expect(screen.getByText("FYI")).toBeInTheDocument();
    expect(screen.getByText("Newsletters")).toBeInTheDocument();
  });

  it("shows thread counts", () => {
    render(
      <BucketTabs
        buckets={BUCKETS}
        activeBucket={null}
        onSelect={() => {}}
        totalThreads={47}
      />
    );

    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("calls onSelect with null when All is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <BucketTabs
        buckets={BUCKETS}
        activeBucket="b1"
        onSelect={onSelect}
        totalThreads={47}
      />
    );

    await userEvent.click(screen.getByText("All"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("calls onSelect with bucket id when bucket is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <BucketTabs
        buckets={BUCKETS}
        activeBucket={null}
        onSelect={onSelect}
        totalThreads={47}
      />
    );

    await userEvent.click(screen.getByText("FYI"));
    expect(onSelect).toHaveBeenCalledWith("b2");
  });
});
