import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { queueUp, getQueue, JOBS_DIR, SERVER_TOOLS, type ServerTool } from "@/server/queue";

/** GET /api/jobs/:id/file → the converted file. Files are deleted by the worker's sweeper after 1 hour. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  if (!(await queueUp())) return new Response("Server tools are temporarily unavailable.", { status: 503 });
  const job = await getQueue().getJob(id);
  if (!job || (await job.getState()) !== "completed") return new Response("Not ready", { status: 404 });
  const spec = SERVER_TOOLS[job.data.tool as ServerTool];
  try {
    const data = await readFile(join(JOBS_DIR, id, `output.${spec.outExt}`));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": spec.outType,
        "Content-Disposition": `attachment; filename="converted.${spec.outExt}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("This file has expired and been deleted.", { status: 410 });
  }
}
