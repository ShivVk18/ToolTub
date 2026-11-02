import { convertQueue } from "@/server/queue";

const UUID = /^[0-9a-f-]{36}$/;

/** GET /api/jobs/:id → { state: waiting | active | completed | failed | unknown } */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ state: "unknown" }, { status: 404 });
  const job = await convertQueue.getJob(id);
  if (!job) return Response.json({ state: "unknown" }, { status: 404 });
  const state = await job.getState();
  return Response.json(
    { state: state === "delayed" || state === "prioritized" ? "waiting" : state, error: state === "failed" ? humanError(job.failedReason) : undefined },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const humanError = (r?: string) =>
  r?.includes("timeout") ? "The conversion took too long. Try a smaller PDF." : "We couldn't convert this PDF. Scanned or image-only PDFs need OCR first.";
