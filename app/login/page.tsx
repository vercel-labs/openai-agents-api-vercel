import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { isAuthenticated } from "@/lib/auth";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="site-identity">
          <span className="brand" aria-hidden="true">▲</span>
          <span>OpenAI Agents API</span>
          <span className="plus" aria-hidden="true">×</span>
          <span>Vercel</span>
        </div>
        <h1>Sign in</h1>
        <p className="login-copy">
          Enter the password configured for this deployment.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
