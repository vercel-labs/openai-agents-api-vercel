import { afterEach, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/openai";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("OpenAI Agents API client", () => {
  it("uses the official SDK to create a self-hosted session", async () => {
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
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/agents/sessions");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer test-app-key",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      agent_id: "agent_test",
      environment: {
        type: "self_hosted",
        workspace_directory: "/workspace",
      },
    });
  });
});
