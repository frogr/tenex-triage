import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * GET /api/suggestions — suggest new buckets based on email patterns.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [threads, existingBuckets] = await Promise.all([
    prisma.emailThread.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 100,
      select: { sender: true, subject: true, snippet: true },
    }),
    prisma.bucket.findMany({
      where: { userId },
      select: { name: true, description: true },
    }),
  ]);

  if (threads.length < 10) {
    return NextResponse.json({ suggestions: [], reason: "Not enough threads to analyze" });
  }

  // Sample up to 50 threads for the prompt
  const sample = threads.slice(0, 50).map((t) =>
    `From: ${t.sender} | Subject: ${t.subject} | ${t.snippet}`
  ).join("\n");

  const existingList = existingBuckets.map((b) => `- ${b.name}: ${b.description}`).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You analyze email patterns and suggest new organizational buckets.
You will be given a sample of email threads and a list of existing buckets.
Suggest 1-3 NEW buckets that would help organize emails that don't fit well into the existing buckets.
Only suggest buckets if there's a clear pattern in the emails that isn't covered.
Each suggestion needs a short name (2-4 words) and a one-sentence description.`,
      },
      {
        role: "user",
        content: `Existing buckets:\n${existingList}\n\nEmail sample:\n${sample}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "bucket_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["name", "description", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["suggestions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ suggestions: [] });
  }

  const parsed = JSON.parse(content) as {
    suggestions: { name: string; description: string; reason: string }[];
  };

  // Filter out suggestions that duplicate existing bucket names
  const existingNames = new Set(existingBuckets.map((b) => b.name.toLowerCase()));
  const filtered = parsed.suggestions.filter(
    (s) => !existingNames.has(s.name.toLowerCase())
  );

  return NextResponse.json({ suggestions: filtered });
}
