import { QueueClient } from "@vercel/queue";
import OpenAI from "openai";
import { QUEUE_TOPIC, config } from "@/lib/config";
import { sessionIdToReconcile, type WebhookEvent } from "@/lib/webhook";

const queue = new QueueClient({ region: "iad1" });

export async function POST(request: Request) {
  if (config.webhookSecret === "pending-webhook-registration") {
    return new Response("Webhook not configured", { status: 503 });
  }
  const payload = await request.text();
  const verifier = new OpenAI({
    apiKey: "unused",
    webhookSecret: config.webhookSecret,
  });

  try {
    await verifier.webhooks.verifySignature(payload, request.headers);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload) as WebhookEvent;
  const sessionId = sessionIdToReconcile(event);
  if (sessionId) {
    await queue.send(
      QUEUE_TOPIC,
      { sessionId },
      event.id ? { idempotencyKey: event.id } : undefined,
    );
  }
  return new Response("ok");
}
