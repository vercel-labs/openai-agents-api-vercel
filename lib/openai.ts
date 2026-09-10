import OpenAI from "openai";
import type { AgentSession } from "openai/resources/beta/agents/agents";
import { config } from "@/lib/config";

function client() {
  return new OpenAI({ apiKey: config.appApiKey });
}

export async function createSession() {
  return client().beta.agents.sessions.create({
    agent_id: config.agentId,
    environment: {
      type: "self_hosted",
      workspace_directory: "/workspace",
    },
  });
}

export async function getSession(sessionId: string) {
  return client().beta.agents.sessions.retrieve(sessionId, { timeout: 30_000 });
}

export async function deleteSession(sessionId: string) {
  return client().beta.agents.sessions.delete(sessionId, { timeout: 30_000 });
}

export function runSession(
  sessionId: string,
  input: string,
  idempotencyKey: string,
) {
  return client().beta.agents.sessions.stream(
    sessionId,
    { input, idempotencyKey },
    { timeout: 15 * 60_000 },
  );
}

export function sandboxConnection(session: AgentSession) {
  if (session.environment.type !== "self_hosted") return null;
  return {
    environmentId: session.environment.id,
    remoteUrl: session.environment.remote_url,
  };
}

export function isSessionForThisDemo(session: AgentSession) {
  return (
    session.environment.type === "self_hosted" &&
    session.agent.id === config.agentId
  );
}
