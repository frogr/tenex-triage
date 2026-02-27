import { prisma } from "@/lib/prisma";
import { createBatches, runBatchesInParallel } from "./batch";
import { classifyBatch as openaiClassifyBatch, MODEL } from "./openai";
import type { ClassificationInput, BucketDefinition } from "./types";

// GPT-4o-mini pricing per 1M tokens
const INPUT_COST_PER_M = 0.15;
const OUTPUT_COST_PER_M = 0.60;

type ProgressCallback = (step: string, data: Record<string, unknown>) => void;

export async function runClassificationPipeline(
  userId: string,
  onProgress?: ProgressCallback,
  reclassifyAll = false
): Promise<string> {
  const emit = onProgress ?? (() => {});

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
  const bucketNameToId = new Map(buckets.map((b) => [b.name, b.id]));

  const allThreads = await prisma.emailThread.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  const manualCount = allThreads.filter((t) => t.userOverride).length;
  const alreadyClassified = allThreads.filter(
    (t) => t.bucketId && !t.userOverride
  ).length;

  // Only classify threads that need it (unless reclassifyAll)
  const threads = reclassifyAll
    ? allThreads.filter((t) => !t.userOverride)
    : allThreads.filter((t) => !t.userOverride && !t.bucketId);

  emit("scanning", {
    total: allThreads.length,
    manual: manualCount,
    alreadyClassified,
    toClassify: threads.length,
  });

  if (threads.length === 0) {
    emit("complete", {
      classifiedCount: 0,
      message: "Everything is already classified!",
    });
    return "";
  }

  const run = await prisma.classificationRun.create({
    data: {
      userId,
      status: "running",
      totalThreads: threads.length,
      bucketSnapshot: JSON.parse(JSON.stringify(bucketDefs)),
      modelUsed: MODEL,
    },
  });

  const inputs: ClassificationInput[] = threads.map((t) => ({
    threadId: t.id,
    sender: t.sender,
    subject: t.subject,
    snippet: t.snippet,
    date: t.date.toISOString(),
  }));

  const batches = createBatches(inputs);

  emit("classifying", { threadCount: threads.length });

  try {
    let totalInput = 0;
    let totalOutput = 0;
    let classifiedSoFar = 0;

    const { results, failures } = await runBatchesInParallel(
      batches,
      async (batch) => {
        const { results, inputTokens, outputTokens } =
          await openaiClassifyBatch(batch, bucketDefs);
        totalInput += inputTokens;
        totalOutput += outputTokens;
        return results;
      },
      (_completed, _total) => {
        classifiedSoFar = Math.min(classifiedSoFar + 25, threads.length);
        emit("progress", {
          classified: classifiedSoFar,
          total: threads.length,
        });
      }
    );

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

    const costCents =
      (totalInput / 1_000_000) * INPUT_COST_PER_M * 100 +
      (totalOutput / 1_000_000) * OUTPUT_COST_PER_M * 100;

    await prisma.classificationRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        classifiedCount,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        costCents,
        completedAt: new Date(),
        errorMessage:
          failures > 0 ? `${failures} batch(es) failed after retry` : null,
      },
    });

    emit("complete", {
      classifiedCount,
      costCents: Math.round(costCents * 100) / 100,
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
