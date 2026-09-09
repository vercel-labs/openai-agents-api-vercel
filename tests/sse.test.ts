import { describe, expect, it } from "vitest";
import {
  eventTurnId,
  eventType,
  isTextDeltaEvent,
  parseSseBlock,
} from "@/lib/sse";

describe("SSE parsing", () => {
  it("parses named JSON events", () => {
    const event = parseSseBlock(
      'id: evt_1\nevent: session.turn.completed\ndata: {"type":"session.turn.completed","turn_id":"turn_1"}',
    );
    expect(event).not.toBeNull();
    expect(eventType(event!)).toBe("session.turn.completed");
    expect(eventTurnId(event!)).toBe("turn_1");
  });

  it("joins multiline data", () => {
    const event = parseSseBlock('data: {"type":\ndata: "session.idle"}');
    expect(eventType(event!)).toBe("session.idle");
  });

  it("identifies output text deltas that should not fill the event panel", () => {
    const delta = parseSseBlock(
      'data: {"type":"session.turn.output_text.delta","delta":"hello"}',
    );
    const completed = parseSseBlock(
      'data: {"type":"session.turn.completed","turn_id":"turn_1"}',
    );

    expect(isTextDeltaEvent(delta!)).toBe(true);
    expect(isTextDeltaEvent(completed!)).toBe(false);
  });
});
