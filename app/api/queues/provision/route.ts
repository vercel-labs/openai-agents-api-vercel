import { QueueClient } from "@vercel/queue";
import { connectSandbox, deleteSandbox } from "@/lib/sandbox";
import {
  getSession,
  isSessionForThisDemo,
  sandboxAction,
} from "@/lib/openai";

const queue = new QueueClient({ region: "iad1" });

export const maxDuration = 180;

export const POST = queue.handleCallback<{ sessionId: string }>(
  async ({ sessionId }) => {
    let session;
    try {
      session = await getSession(sessionId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("returned 404")) return;
      throw error;
    }

    if (!isSessionForThisDemo(session)) return;
    if (session.status === "failed") {
      await deleteSandbox(sessionId);
      return;
    }

    const action = sandboxAction(session);
    if (!action?.environment_id) return;
    const { sandbox } = await connectSandbox(sessionId, action.environment_id);
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
