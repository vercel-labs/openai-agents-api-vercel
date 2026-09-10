import type { AgentSessionEvent } from "openai/resources/beta/agents/agents";

export type ParsedEvent = {
  event: string;
  id?: string;
  data: Record<string, unknown>;
};

export function parseSseBlock(block: string): ParsedEvent | null {
  let event = "message";
  let id: string | undefined;
  const data: string[] = [];

  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    if (field === "id") id = value;
    if (field === "data") data.push(value);
  }

  if (data.length === 0) return null;
  const decoded = JSON.parse(data.join("\n")) as Record<string, unknown>;
  return { event, id, data: decoded };
}

export function eventType(event: ParsedEvent) {
  return typeof event.data.type === "string" ? event.data.type : event.event;
}

export function outputTextDelta(event: ParsedEvent) {
  if (eventType(event) !== "agent.session.turn.output_text.delta") return undefined;
  if (typeof event.data.delta === "string") return event.data.delta;

  const data = event.data.data;
  if (data && typeof data === "object" && "delta" in data) {
    const delta = (data as Record<string, unknown>).delta;
    return typeof delta === "string" ? delta : undefined;
  }

  return undefined;
}

export function outputTextPartKey(event: ParsedEvent) {
  if (eventType(event) !== "agent.session.turn.output_text.delta") return undefined;

  const nested = event.data.data;
  const data = nested && typeof nested === "object"
    ? nested as Record<string, unknown>
    : event.data;
  const itemId = typeof data.item_id === "string" ? data.item_id : "";
  const outputIndex = typeof data.output_index === "number" ? data.output_index : "";
  const contentIndex = typeof data.content_index === "number" ? data.content_index : "";

  if (!itemId && outputIndex === "" && contentIndex === "") return undefined;
  return `${itemId}:${outputIndex}:${contentIndex}`;
}

export function eventTurnId(event: ParsedEvent) {
  const direct = event.data.turn_id;
  if (typeof direct === "string") return direct;
  const data = event.data.data;
  if (data && typeof data === "object" && "turn_id" in data) {
    const nested = (data as Record<string, unknown>).turn_id;
    return typeof nested === "string" ? nested : undefined;
  }
  return undefined;
}

type AgentEventStream = AsyncIterable<AgentSessionEvent> & {
  abort(reason?: unknown): void;
};

export function createBrowserEventStream(source: AgentEventStream) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of source) {
          controller.enqueue(
            encoder.encode(
              `id: ${event.event_id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
            ),
          );
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      source.abort(reason);
    },
  });
}
