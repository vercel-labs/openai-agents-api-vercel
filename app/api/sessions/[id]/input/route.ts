import { randomUUID } from "node:crypto";
import { isAuthenticated } from "@/lib/auth";
import { runSession } from "@/lib/openai";
import { createBrowserEventStream } from "@/lib/sse";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { input } = (await request.json()) as { input?: unknown };
  if (typeof input !== "string" || !input.trim()) {
    return Response.json({ error: "input is required" }, { status: 400 });
  }

  const { id } = await params;
  try {
    const events = runSession(id, input.trim(), randomUUID());
    return new Response(createBrowserEventStream(events), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not run input" },
      { status: 502 },
    );
  }
}
