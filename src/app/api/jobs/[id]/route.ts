import { queueUp, getQueue } from "@/server/queue";

const UUID = /^[0-9a-f-]{36}$/;

/** GET /api/jobs/:id → { state: waiting | active | completed | failed | unknown } */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return Response.json({ state: "unknown" }, { status: 404 });
  if (!(await queueUp())) return Response.json({ state: "unknown", error: "Server tools are temporarily unavailable." }, { status: 503 });
  const job = await getQueue().getJob(id);
  if (!job) return Response.json({ state: "unknown" }, { status: 404 });
  const raw = await job.getState();
  const state = raw === "delayed" || raw === "prioritized" ? "waiting" : raw;
  // Queue position (1 = next). Waiting jobs are listed newest first, so count from the end.
  let position: number | undefined;
  if (state === "waiting") {
    const waiting = await getQueue().getWaiting();
    const i = waiting.findIndex((j) => j.id === id);
    position = i === -1 ? undefined : waiting.length - i;
  }
  return Response.json(
    { state, position, error: state === "failed" ? humanError(job.failedReason) : undefined },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const humanError = (r?: string) =>
  r?.includes("timeout") ? "The conversion took too long. Try a smaller PDF." : "We couldn't convert this PDF. Scanned or image-only PDFs need OCR first.";
