import OpenAI from "openai";
import type {
  ClassificationInput,
  ClassificationResult,
  BucketDefinition,
} from "./types";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-4o-mini";

/**
 * Classify a batch of threads using OpenAI structured output.
 * Returns parsed results and token usage.
 */
export async function classifyBatch(
  batch: ClassificationInput[],
  buckets: BucketDefinition[]
): Promise<{
  results: ClassificationResult[];
  inputTokens: number;
  outputTokens: number;
}> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(buckets) },
      { role: "user", content: buildUserPrompt(batch) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "email_classification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            classifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  threadId: { type: "string" },
                  bucket: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["threadId", "bucket", "confidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["classifications"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content) as { classifications: ClassificationResult[] };

  // Validate: only keep results with known thread IDs and bucket names
  const batchIds = new Set(batch.map((t) => t.threadId));
  const bucketNames = new Set(buckets.map((b) => b.name));

  const validated = parsed.classifications.filter((c) => {
    if (!batchIds.has(c.threadId)) return false;
    if (!bucketNames.has(c.bucket)) return false;
    return true;
  });

  return {
    results: validated,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

export { MODEL };
