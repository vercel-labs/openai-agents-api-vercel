import { randomUUID } from "node:crypto";
import { openEventStream, sendInput } from "@/lib/openai";
import { createSingleRunStream } from "@/lib/sse";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { input } = (await request.json()) as { input?: unknown };
  if (typeof input !== "string" || !input.trim()) {
    return Response.json({ error: "input is required" }, { status: 400 });
  }

  const { id } = await params;
  try {
    // Subscribe before sending input so short runs cannot finish before the
    // client starts listening for their events.
    const upstream = await openEventStream(id);
    await sendInput(id, input.trim(), randomUUID());
    return new Response(createSingleRunStream(upstream.body!), {
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
