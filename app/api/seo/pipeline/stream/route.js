import { runSeoPipeline } from "@/lib/seo-pipeline-runner";

/**
 * POST /api/seo/pipeline/stream
 * Same as /api/seo/pipeline but streams NDJSON progress events so the UI can show what the pipeline is doing.
 * Each line: { type: "progress", step, status, message } or { type: "result", data } or { type: "error", error }.
 */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const onProgress = (step, status, message) => {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "progress", step, status, message }) + "\n")
        );
      };
      try {
        const data = await runSeoPipeline(body, onProgress);
        controller.enqueue(encoder.encode(JSON.stringify({ type: "result", data }) + "\n"));
      } catch (err) {
        console.error("[api/seo/pipeline/stream]", err);
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "error", error: err.message || "Pipeline failed" }) + "\n")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
