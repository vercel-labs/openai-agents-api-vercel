import { redirect } from "next/navigation";
import { Demo } from "@/components/demo";
import { isAuthenticated } from "@/lib/auth";

export default async function Home() {
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="site-identity">
          <span className="brand" aria-hidden="true">▲</span>
          <span>OpenAI Agents API</span>
          <span className="plus" aria-hidden="true">×</span>
          <span>Vercel Sandbox</span>
        </div>
        <a href="https://github.com/vercel-labs/openai-agents-api-vercel">
          GitHub ↗
        </a>
        <form className="logout-form" action="/api/auth/logout" method="post">
          <button type="submit">Sign out</button>
        </form>
      </header>
      <section className="hero">
        <h1>Run a coding agent in an isolated Sandbox.</h1>
        <p className="lede">
          OpenAI manages the agent loop and session state. Vercel gives each
          session a persistent workspace for files, commands, and tests.
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
