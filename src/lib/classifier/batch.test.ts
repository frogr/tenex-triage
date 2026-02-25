import { describe, it, expect, vi } from "vitest";
import { createBatches, runBatchesInParallel, BATCH_SIZE } from "./batch";
import type { ClassificationInput, ClassificationResult } from "./types";

function makeThread(id: string): ClassificationInput {
  return {
    threadId: id,
    sender: "test@example.com",
    subject: "Test",
    snippet: "Test snippet",
    date: "2024-01-01T00:00:00Z",
  };
}

function makeResult(id: string): ClassificationResult {
  return { threadId: id, bucket: "FYI", confidence: 0.9 };
}

describe("createBatches", () => {
  it("splits 200 threads into 8 batches of 25", () => {
    const threads = Array.from({ length: 200 }, (_, i) =>
      makeThread(`t-${i}`)
    );
    const batches = createBatches(threads);
    expect(batches).toHaveLength(8);
    expect(batches[0]).toHaveLength(BATCH_SIZE);
    expect(batches[7]).toHaveLength(BATCH_SIZE);
  });

  it("handles non-even splits", () => {
    const threads = Array.from({ length: 30 }, (_, i) =>
      makeThread(`t-${i}`)
    );
    const batches = createBatches(threads);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(25);
    expect(batches[1]).toHaveLength(5);
  });

  it("handles empty input", () => {
    const batches = createBatches([]);
    expect(batches).toHaveLength(0);
  });

  it("single thread becomes one batch", () => {
    const batches = createBatches([makeThread("t-0")]);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
  });

  it("exactly BATCH_SIZE threads becomes one batch", () => {
    const threads = Array.from({ length: BATCH_SIZE }, (_, i) =>
      makeThread(`t-${i}`)
    );
    const batches = createBatches(threads);
    expect(batches).toHaveLength(1);
  });
});

describe("runBatchesInParallel", () => {
  it("collects results from all batches", async () => {
    const batches = [
      [makeThread("t-0"), makeThread("t-1")],
      [makeThread("t-2")],
    ];

    const classify = vi.fn(async (batch: ClassificationInput[]) =>
      batch.map((t) => makeResult(t.threadId))
    );

    const { results, failures } = await runBatchesInParallel(
      batches,
      classify
    );

    expect(results).toHaveLength(3);
    expect(failures).toBe(0);
    expect(classify).toHaveBeenCalledTimes(2);
  });

  it("retries failed batches once then counts failure", async () => {
    const batches = [[makeThread("t-0")]];
    let attempts = 0;

    const classify = vi.fn(async () => {
      attempts++;
      throw new Error("API error");
    });

    const { results, failures } = await runBatchesInParallel(
      batches,
      classify
    );

    expect(results).toHaveLength(0);
    expect(failures).toBe(1);
    expect(attempts).toBe(2); // original + retry
  });

  it("succeeds on retry", async () => {
    const batches = [[makeThread("t-0")]];
    let attempts = 0;

    const classify = vi.fn(async (batch: ClassificationInput[]) => {
      attempts++;
      if (attempts === 1) throw new Error("Transient error");
      return batch.map((t) => makeResult(t.threadId));
    });

    const { results, failures } = await runBatchesInParallel(
      batches,
      classify
    );

    expect(results).toHaveLength(1);
    expect(failures).toBe(0);
  });

  it("calls onProgress for each batch", async () => {
    const batches = [
      [makeThread("t-0")],
      [makeThread("t-1")],
      [makeThread("t-2")],
    ];

    const classify = async (batch: ClassificationInput[]) =>
      batch.map((t) => makeResult(t.threadId));

    const progress = vi.fn();
    await runBatchesInParallel(batches, classify, progress);

    expect(progress).toHaveBeenCalledTimes(3);
  });

  it("handles partial failures gracefully", async () => {
    const batches = [
      [makeThread("t-0")],
      [makeThread("t-1")],
    ];

    const classify = vi.fn(async (batch: ClassificationInput[]) => {
      // Always fail batch containing t-1
      if (batch[0].threadId === "t-1") throw new Error("Fail");
      return batch.map((t) => makeResult(t.threadId));
    });

    const { results, failures } = await runBatchesInParallel(
      batches,
      classify
    );

    expect(results).toHaveLength(1); // first batch succeeded
    expect(failures).toBe(1); // second batch failed
  });
});
