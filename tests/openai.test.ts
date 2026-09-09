import { afterEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/openai";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("OpenAI Agents API client", () => {
  it("uses the preview contract when creating a self-hosted session", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-app-key");
    vi.stubEnv("OPENAI_AGENT_ID", "agent_test");

    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "session_test", status: "pending" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(createSession()).resolves.toMatchObject({ id: "session_test" });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/agents/sessions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-app-key",
          "OpenAI-Beta": "agents=v1",
        }),
        body: JSON.stringify({
          agent_id: "agent_test",
          environment: {
            type: "self_hosted",
            workspace_directory: "/workspace",
          },
        }),
      }),
    );
  });
});
