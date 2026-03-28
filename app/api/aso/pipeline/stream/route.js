import { runAsoPipeline } from "@/lib/aso-pipeline-runner";
import { requireAdmin } from "@/lib/require-admin-auth";

/**
 * POST /api/aso/pipeline/stream
 * Same as /api/aso/pipeline but streams NDJSON: { type: "progress", step, status, message } or { type: "result", data } or { type: "error", error }.
 */
export async function POST(request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
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
        const data = await runAsoPipeline(body, onProgress);
        controller.enqueue(encoder.encode(JSON.stringify({ type: "result", data }) + "\n"));
      } catch (err) {
        console.error("[api/aso/pipeline/stream]", err);
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
