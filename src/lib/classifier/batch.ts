import type { ClassificationInput, ClassificationResult } from "./types";

const BATCH_SIZE = 25;

/**
 * Split threads into batches of BATCH_SIZE.
 */
export function createBatches(
  threads: ClassificationInput[]
): ClassificationInput[][] {
  const batches: ClassificationInput[][] = [];
  for (let i = 0; i < threads.length; i += BATCH_SIZE) {
    batches.push(threads.slice(i, i + BATCH_SIZE));
  }
  return batches;
}

/**
 * Run a classifier function across all batches in parallel.
 * Uses Promise.allSettled so one batch failure doesn't kill the run.
 * Retries failed batches once.
 */
export async function runBatchesInParallel(
  batches: ClassificationInput[][],
  classifyBatch: (batch: ClassificationInput[]) => Promise<ClassificationResult[]>,
  onProgress?: (completed: number, total: number) => void
): Promise<{ results: ClassificationResult[]; failures: number }> {
  const allResults: ClassificationResult[] = [];
  let failures = 0;

  const settled = await Promise.allSettled(
    batches.map(async (batch, i) => {
      try {
        const results = await classifyBatch(batch);
        onProgress?.(i + 1, batches.length);
        return results;
      } catch {
        // Retry once
        try {
          await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // backoff
          const results = await classifyBatch(batch);
          onProgress?.(i + 1, batches.length);
          return results;
        } catch {
          onProgress?.(i + 1, batches.length);
          throw new Error(`Batch ${i} failed after retry`);
        }
      }
    })
  );

  for (const result of settled) {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    } else {
      failures++;
    }
  }

  return { results: allResults, failures };
}

export { BATCH_SIZE };
