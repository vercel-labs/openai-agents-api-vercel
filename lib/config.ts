const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const config = {
  get appApiKey() {
    return required("OPENAI_API_KEY");
  },
  get agentId() {
    return required("OPENAI_AGENT_ID");
  },
  get executorApiKey() {
    return required("OPENAI_EXECUTOR_API_KEY");
  },
  get webhookSecret() {
    return process.env.OPENAI_WEBHOOK_SECRET ?? "pending-webhook-registration";
  },
};

export const SANDBOX_TIMEOUT_MS = 30 * 60_000;
export const QUEUE_TOPIC = "sandbox-wakeup";
