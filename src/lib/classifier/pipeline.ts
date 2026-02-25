import { prisma } from "@/lib/prisma";
import { createBatches, runBatchesInParallel } from "./batch";
import { classifyBatch as openaiClassifyBatch, MODEL } from "./openai";
import type { ClassificationInput, BucketDefinition } from "./types";

// GPT-4o-mini pricing per 1M tokens
const INPUT_COST_PER_M = 0.15;
const OUTPUT_COST_PER_M = 0.60;

/**
 * Run the full classification pipeline for a user.
 * Fetches threads, batches them, classifies via LLM, and persists results.
 */
export async function runClassificationPipeline(
  userId: string,
  onProgress?: (classified: number, total: number) => void
): Promise<string> {
  // Get user's buckets
  const buckets = await prisma.bucket.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });

  if (buckets.length === 0) {
    throw new Error("No buckets found — create buckets before classifying");
  }

  const bucketDefs: BucketDefinition[] = buckets.map((b) => ({
    name: b.name,
    description: b.description,
  }));

  // Build a name → id map for assignment
  const bucketNameToId = new Map(buckets.map((b) => [b.name, b.id]));

  // Get threads that haven't been manually overridden
  const threads = await prisma.emailThread.findMany({
    where: { userId, userOverride: false },
    orderBy: { date: "desc" },
  });

  if (threads.length === 0) {
    throw new Error("No threads to classify — sync from Gmail first");
  }

  // Create the classification run record
  const run = await prisma.classificationRun.create({
    data: {
      userId,
      status: "running",
      totalThreads: threads.length,
      bucketSnapshot: JSON.parse(JSON.stringify(bucketDefs)),
      modelUsed: MODEL,
    },
  });

  try {
    // Format threads for the LLM
    const inputs: ClassificationInput[] = threads.map((t) => ({
      threadId: t.id,
      sender: t.sender,
      subject: t.subject,
      snippet: t.snippet,
      date: t.date.toISOString(),
    }));

    const batches = createBatches(inputs);

    let totalInput = 0;
    let totalOutput = 0;

    // Run all batches
    const { results, failures } = await runBatchesInParallel(
      batches,
      async (batch) => {
        const { results, inputTokens, outputTokens } =
          await openaiClassifyBatch(batch, bucketDefs);
        totalInput += inputTokens;
        totalOutput += outputTokens;
        return results;
      },
      onProgress
    );

    // Persist classifications to threads
    let classifiedCount = 0;
    for (const result of results) {
      const bucketId = bucketNameToId.get(result.bucket);
      if (!bucketId) continue;

      await prisma.emailThread.update({
        where: { id: result.threadId },
        data: {
          bucketId,
          confidence: result.confidence,
          classifiedAt: new Date(),
        },
      });
      classifiedCount++;
    }

    // Calculate cost
    const costCents =
      (totalInput / 1_000_000) * INPUT_COST_PER_M * 100 +
      (totalOutput / 1_000_000) * OUTPUT_COST_PER_M * 100;

    // Update the run record
    await prisma.classificationRun.update({
      where: { id: run.id },
      data: {
        status: failures > 0 ? "completed" : "completed",
        classifiedCount,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        costCents,
        completedAt: new Date(),
        errorMessage:
          failures > 0 ? `${failures} batch(es) failed after retry` : null,
      },
    });

    return run.id;
  } catch (error) {
    await prisma.classificationRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}
