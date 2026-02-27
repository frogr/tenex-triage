import { auth } from "@/lib/auth";
import { runClassificationPipeline } from "@/lib/classifier/pipeline";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const reclassifyAll = body.reclassifyAll === true;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        const runId = await runClassificationPipeline(
          userId,
          (step, data) => send({ step, ...data }),
          reclassifyAll
        );
        send({ step: "done", runId });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Classification failed";
        send({ step: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
