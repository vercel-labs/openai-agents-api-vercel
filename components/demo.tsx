"use client";

import { FormEvent, useMemo, useState } from "react";
import { eventType, parseSseBlock, type ParsedEvent } from "@/lib/sse";

type Session = { id: string; status?: string };

function eventText(event: ParsedEvent) {
  const candidates = [event.data.delta, event.data.output_text, event.data.text];
  const nested = event.data.data;
  if (nested && typeof nested === "object") {
    const value = nested as Record<string, unknown>;
    candidates.push(value.delta, value.output_text, value.text);
  }
  return candidates.find((value): value is string => typeof value === "string");
}

async function errorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${response.status})`;
}

export function Demo() {
  const [prompt, setPrompt] = useState(
    "Create a small Node.js program that prints the first 10 Fibonacci numbers, run it, and explain the result.",
  );
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  const status = useMemo(() => {
    if (error) return "error";
    if (running) return "running";
    if (session) return "ready";
    return "not started";
  }, [error, running, session]);

  async function create() {
    const response = await fetch("/api/sessions", {
      method: "POST",
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    const created = (await response.json()) as Session;
    setSession(created);
    return created;
  }

  async function run(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setRunning(true);
    setError("");
    setEvents([]);
    setOutput("");

    try {
      const active = session ?? (await create());
      const response = await fetch(`/api/sessions/${active.id}/input`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: prompt }),
      });
      if (!response.ok || !response.body) throw new Error(await errorMessage(response));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const parsed = parseSseBlock(block);
          if (!parsed) continue;
          setEvents((current) => [...current, parsed].slice(-30));
          const text = eventText(parsed);
          if (text) setOutput((current) => current + text);
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  }

  async function cleanup() {
    if (!session) return;
    await fetch(`/api/sessions/${session.id}`, {
      method: "DELETE",
    });
    setSession(null);
    setEvents([]);
    setOutput("");
  }

  return (
    <section className="demo">
      <div className="demo-header">
        <div>
          <span className={`status ${status}`}>{status}</span>
          <h2>Try the managed Sandbox flow</h2>
        </div>
        {session && <code>{session.id}</code>}
      </div>
      <form onSubmit={run}>
        <label>
          Task
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </label>
        <div className="actions">
          <button disabled={running || !prompt.trim()}>
            {running ? "Agent running…" : session ? "Send follow-up" : "Start session"}
          </button>
          {session && (
            <button type="button" className="secondary" onClick={cleanup} disabled={running}>
              Delete session
            </button>
          )}
        </div>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="results">
        <div>
          <h3>Agent output</h3>
          <pre>{output || "Output will stream here."}</pre>
        </div>
        <div>
          <h3>Session events</h3>
          <ol>
            {events.length === 0 ? (
              <li className="muted">Waiting for a run.</li>
            ) : (
              events.map((event, index) => <li key={`${event.id ?? index}`}>{eventType(event)}</li>)
            )}
          </ol>
        </div>
      </div>
    </section>
  );
}
