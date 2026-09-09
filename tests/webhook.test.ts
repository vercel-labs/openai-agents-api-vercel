import { describe, expect, it } from "vitest";
import { sessionIdToReconcile } from "@/lib/webhook";

describe("webhook routing", () => {
  it("queues environment connection actions", () => {
    expect(
      sessionIdToReconcile({
        type: "agent.session.action_required",
        data: { id: "session_1", required_action: { type: "environment_connection" } },
      }),
    ).toBe("session_1");
  });

  it("queues failed sessions for cleanup", () => {
    expect(
      sessionIdToReconcile({ type: "agent.session.failed", data: { id: "session_2" } }),
    ).toBe("session_2");
  });

  it("ignores unrelated events", () => {
    expect(
      sessionIdToReconcile({ type: "agent.session.idle", data: { id: "session_3" } }),
    ).toBeNull();
  });
});
