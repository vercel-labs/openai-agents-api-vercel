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
  if (eventType(event) !== "session.turn.output_text.delta") return undefined;
  if (typeof event.data.delta === "string") return event.data.delta;

  const data = event.data.data;
  if (data && typeof data === "object" && "delta" in data) {
    const delta = (data as Record<string, unknown>).delta;
    return typeof delta === "string" ? delta : undefined;
  }

  return undefined;
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

export function createSingleRunStream(source: ReadableStream<Uint8Array>) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = source.getReader();
      let buffer = "";
      let turnId: string | undefined;
      let sawTurnEnd = false;
      let complete = false;

      const processBlock = (block: string) => {
        controller.enqueue(encoder.encode(`${block}\n\n`));
        const parsed = parseSseBlock(block);
        if (!parsed) return;
        const type = eventType(parsed);
        const currentTurnId = eventTurnId(parsed);
        if (!turnId && currentTurnId) turnId = currentTurnId;
        if (
          ["session.turn.completed", "session.turn.failed", "session.turn.cancelled"].includes(
            type,
          ) &&
          turnId &&
          currentTurnId === turnId
        ) {
          sawTurnEnd = true;
        }
        complete =
          type === "session.failed" || (type === "session.idle" && sawTurnEnd);
      };

      try {
        while (!complete) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            if (block) processBlock(block);
            if (complete) break;
          }
        }
        if (!complete && buffer.trim()) processBlock(buffer);
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        await reader.cancel().catch(() => undefined);
      }
    },
  });
}
