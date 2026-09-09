export type WebhookEvent = {
  id?: string;
  type?: string;
  data?: {
    id?: string;
    required_action?: { type?: string };
  };
};

export function sessionIdToReconcile(event: WebhookEvent) {
  if (!event.data?.id) return null;
  if (event.type === "agent.session.failed") return event.data.id;
  if (
    event.type === "agent.session.action_required" &&
    event.data.required_action?.type === "environment_connection"
  ) {
    return event.data.id;
  }
  return null;
}
