import { redirect } from "next/navigation";
import { Demo } from "@/components/demo";
import { isAuthenticated } from "@/lib/auth";

export default async function Home() {
  if (!(await isAuthenticated())) redirect("/login");

  return (
    <main className="page-shell">
      <header className="site-header">
        <svg
          aria-label="Vercel"
          className="vercel-logo"
          role="img"
          viewBox="0 0 16 14"
        >
          <path d="M8 0 16 14H0L8 0Z" fill="currentColor" />
        </svg>
        <nav aria-label="Project links">
          <a href="https://github.com/vercel-labs/openai-agents-api-vercel">GitHub</a>
          <form className="logout-form" action="/api/auth/logout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </nav>
      </header>
      <Demo />
    </main>
  );
}
