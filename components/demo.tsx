"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Streamdown } from "streamdown";
import {
  eventType,
  outputTextDelta,
  outputTextPartKey,
  parseSseBlock,
  type ParsedEvent,
} from "@/lib/sse";

type Session = { id: string };
type Message = { id: string; role: "user" | "assistant"; content: string };

async function errorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${response.status})`;
}

export function Demo() {
  const [prompt, setPrompt] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const eventListRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: running ? "smooth" : "auto",
    });
  }, [messages, running]);

  useEffect(() => {
    eventListRef.current?.scrollTo({ top: eventListRef.current.scrollHeight });
  }, [events]);

  async function create() {
    const response = await fetch("/api/sessions", { method: "POST" });
    if (!response.ok) throw new Error(await errorMessage(response));
    const created = (await response.json()) as Session;
    setSession(created);
    return created;
  }

  async function run(event: FormEvent) {
    event.preventDefault();
    const input = prompt.trim();
    if (!input || running) return;

    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: input },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setPrompt("");
    setRunning(true);
    setError("");

    try {
      const active = session ?? (await create());
      const response = await fetch(`/api/sessions/${active.id}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!response.ok || !response.body) throw new Error(await errorMessage(response));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedText = false;
      let currentTextPart: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const parsed = parseSseBlock(block);
          if (!parsed) continue;
          setEvents((current) => [...current, parsed].slice(-50));

          const text = outputTextDelta(parsed);
          if (!text) continue;
          receivedText = true;
          const nextTextPart = outputTextPartKey(parsed);
          const startsNewPart = Boolean(
            currentTextPart && nextTextPart && currentTextPart !== nextTextPart,
          );
          if (nextTextPart) currentTextPart = nextTextPart;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: message.content + paragraphBreak(message.content, startsNewPart) + text,
                  }
                : message,
            ),
          );
        }
      }

      if (!receivedText) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: "The agent completed without a text response." }
              : message,
          ),
        );
      }
    } catch (reason) {
      setMessages((current) => current.filter((message) => message.id !== assistantId));
      setError(reason instanceof Error ? reason.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

  async function cleanup() {
    if (!session || running) return;
    setError("");

    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setSession(null);
      setEvents([]);
      setMessages([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete the session");
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div className="workspace">
      <section className="chat-pane" aria-label="Agent conversation">
        <div className="conversation" ref={conversationRef} role="log" aria-live="polite">
          <div className="message-list">
            {messages.length === 0 ? (
              <div className="empty-state">
                <h1>What can I help you build?</h1>
                <p>
                  OpenAI runs the agent. Vercel hosts the experience, coordinates
                  background work, and provides isolated compute for files and commands.
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-content">
                    {message.content && message.role === "assistant" ? (
                      <Streamdown
                        controls={false}
                        mode={running && index === messages.length - 1 ? "streaming" : "static"}
                        parseIncompleteMarkdown
                      >
                        {message.content}
                      </Streamdown>
                    ) : message.content || (
                      <span className="thinking" aria-label="Agent is working">
                        <i /> <i /> <i />
                      </span>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="composer-wrap">
          {error ? <p className="composer-error" role="alert">{error}</p> : null}
          <form className="composer" onSubmit={run}>
            <label className="sr-only" htmlFor="task">Message the agent</label>
            <textarea
              autoFocus
              id="task"
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask anything…"
              rows={2}
              value={prompt}
            />
            <div className="composer-footer">
              <button
                className={running ? "send-button loading" : "send-button"}
                type="submit"
                disabled={running || !prompt.trim()}
                aria-label={running ? "Agent is running" : "Send message"}
              >
                {running ? <span className="spinner" /> : <span aria-hidden="true">↑</span>}
              </button>
            </div>
          </form>
        </div>
      </section>

      <aside className="session-rail" aria-label="Session details">
        <div className="rail-header">
          <h2>Session</h2>
          {session ? (
            <button
              className="delete-button"
              type="button"
              onClick={cleanup}
              disabled={running}
            >
              Delete
            </button>
          ) : null}
        </div>

        {session ? <code className="session-id">{session.id}</code> : (
          <p className="rail-copy">A session will appear after your first message.</p>
        )}

        <div className="event-section">
          <h3>Events</h3>
          <ol className="event-list" ref={eventListRef}>
            {events.length === 0 ? (
              <li className="muted">Waiting for session activity.</li>
            ) : (
              events.map((item, index) => (
                <li key={`${item.id ?? index}`}>{eventType(item)}</li>
              ))
            )}
          </ol>
        </div>
      </aside>
    </div>
  );
}

function paragraphBreak(content: string, startsNewPart: boolean) {
  if (!content || !startsNewPart || content.endsWith("\n\n")) return "";
  return content.endsWith("\n") ? "\n" : "\n\n";
}
