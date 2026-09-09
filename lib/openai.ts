import { AGENTS_API_URL, config } from "@/lib/config";

export type JsonObject = Record<string, unknown>;

export type AgentSession = JsonObject & {
  id: string;
  status?: string;
  agent_id?: string;
  agent?: { id?: string };
  environment?: { type?: string };
  required_actions?: Array<{
    type?: string;
    environment_id?: string;
  }>;
};

function headers(accept = "application/json") {
  return {
    Authorization: `Bearer ${config.appApiKey}`,
    "OpenAI-Beta": "agents=v1",
    "Content-Type": "application/json",
    Accept: accept,
  };
}

async function decode<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI Agents API returned ${response.status}: ${detail}`);
  }
  const body = await response.text();
  if (!body.trim()) return {} as T;
  return JSON.parse(body) as T;
}

export async function createSession() {
  return decode<AgentSession>(
    await fetch(`${AGENTS_API_URL}/sessions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        agent_id: config.agentId,
        environment: {
          type: "self_hosted",
          workspace_directory: "/workspace",
        },
      }),
    }),
  );
}

export async function getSession(sessionId: string) {
  return decode<AgentSession>(
    await fetch(`${AGENTS_API_URL}/sessions/${encodeURIComponent(sessionId)}`, {
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    }),
  );
}

export async function deleteSession(sessionId: string) {
  return decode<JsonObject>(
    await fetch(`${AGENTS_API_URL}/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: headers(),
      signal: AbortSignal.timeout(30_000),
    }),
  );
}

export async function openEventStream(sessionId: string) {
  const response = await fetch(
    `${AGENTS_API_URL}/sessions/${encodeURIComponent(sessionId)}/events?stream=true`,
    {
      headers: headers("text/event-stream"),
      cache: "no-store",
      signal: AbortSignal.timeout(15 * 60_000),
    },
  );
  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(`Could not open event stream (${response.status}): ${detail}`);
  }
  return response;
}

export async function sendInput(
  sessionId: string,
  input: string,
  idempotencyKey: string,
) {
  return decode<JsonObject>(
    await fetch(
      `${AGENTS_API_URL}/sessions/${encodeURIComponent(sessionId)}/events`,
      {
        method: "POST",
        headers: { ...headers(), "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          events: [
            {
              type: "session.input.message",
              input: [
                {
                  role: "user",
                  content: [{ type: "input_text", text: input }],
                },
              ],
            },
          ],
        }),
      },
    ),
  );
}

export function sandboxAction(session: AgentSession) {
  return session.required_actions?.find(
    (action) => action.type === "environment_connection",
  );
}

export function isSessionForThisDemo(session: AgentSession) {
  return (
    session.environment?.type === "self_hosted" &&
    (session.agent?.id === config.agentId || session.agent_id === config.agentId)
  );
}
