import { QueueClient } from "@vercel/queue";
import { NotFoundError } from "openai";
import { connectSandbox, deleteSandbox } from "@/lib/sandbox";
import {
  getSession,
  isSessionForThisDemo,
  sandboxConnection,
} from "@/lib/openai";

const queue = new QueueClient({ region: "iad1" });

export const maxDuration = 180;

export const POST = queue.handleCallback<{ sessionId: string }>(
  async ({ sessionId }) => {
    let session;
    try {
      session = await getSession(sessionId);
    } catch (error) {
      if (error instanceof NotFoundError) return;
      throw error;
    }

    if (!isSessionForThisDemo(session)) return;
    if (session.status === "failed") {
      await deleteSandbox(sessionId);
      return;
    }

    const connection = sandboxConnection(session);
    if (!connection) return;
    const { sandbox } = await connectSandbox(
      sessionId,
      connection.environmentId,
      connection.remoteUrl,
    );
    console.log(
      JSON.stringify({
        session_id: sessionId,
        sandbox_name: sandbox.name,
        action: "connected",
      }),
    );
  },
  { visibilityTimeoutSeconds: 240 },
);
