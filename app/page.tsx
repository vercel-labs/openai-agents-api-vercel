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
        <nav aria-label="Project links">
          <a href="https://github.com/vercel-labs/openai-agents-api-vercel">GitHub ↗</a>
          <form className="logout-form" action="/api/auth/logout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </nav>
      </header>
      <Demo />
    </main>
  );
}
