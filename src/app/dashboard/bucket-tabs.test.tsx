import { render, screen, within } from "@testing-library/react";
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

    const tablist = screen.getByRole("tablist");
    expect(within(tablist).getByText("All")).toBeInTheDocument();
    expect(within(tablist).getByText("Needs Action")).toBeInTheDocument();
    expect(within(tablist).getByText("FYI")).toBeInTheDocument();
    expect(within(tablist).getByText("Newsletters")).toBeInTheDocument();
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

    const tablist = screen.getByRole("tablist");
    expect(within(tablist).getByText("47")).toBeInTheDocument();
    expect(within(tablist).getByText("12")).toBeInTheDocument();
    expect(within(tablist).getByText("5")).toBeInTheDocument();
    expect(within(tablist).getByText("30")).toBeInTheDocument();
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

    const tablist = screen.getByRole("tablist");
    await userEvent.click(within(tablist).getByText("All"));
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

    const tablist = screen.getByRole("tablist");
    await userEvent.click(within(tablist).getByText("FYI"));
    expect(onSelect).toHaveBeenCalledWith("b2");
  });

  it("renders mobile dropdown with active bucket name", () => {
    render(
      <BucketTabs
        buckets={BUCKETS}
        activeBucket="b2"
        onSelect={() => {}}
        totalThreads={47}
      />
    );

    // Mobile selector shows the active bucket name
    const selector = screen.getByRole("button", { expanded: false });
    expect(within(selector).getByText("FYI")).toBeInTheDocument();
  });

  it("calls onCreateBucket from mobile dropdown", async () => {
    const onCreateBucket = vi.fn();
    render(
      <BucketTabs
        buckets={BUCKETS}
        activeBucket={null}
        onSelect={() => {}}
        onCreateBucket={onCreateBucket}
        totalThreads={47}
      />
    );

    // Open mobile dropdown
    const selector = screen.getByRole("button", { expanded: false });
    await userEvent.click(selector);

    // Click "New bucket..."
    await userEvent.click(screen.getByText("New bucket..."));
    expect(onCreateBucket).toHaveBeenCalled();
  });
});
