import { Demo } from "@/components/demo";

export default function Home() {
  return (
    <main>
      <nav>
        <span className="brand">▲</span>
        <span>OpenAI Agents API</span>
        <span className="plus">×</span>
        <span>Vercel Sandbox</span>
        <a href="https://github.com/vercel-labs/openai-agents-api-vercel">
          GitHub ↗
        </a>
      </nav>
      <section className="hero">
        <p className="eyebrow">Managed agent, isolated execution</p>
        <h1>Give a Codex agent<br />its own Sandbox.</h1>
        <p className="lede">
          OpenAI hosts the agent harness and session state. Vercel gives each
          session a persistent, isolated environment for files and commands.
        </p>
      </section>
      <Demo />
      <footer>
        The application key stays in the control plane. Only a restricted
        executor key enters the Sandbox.
      </footer>
    </main>
  );
}
