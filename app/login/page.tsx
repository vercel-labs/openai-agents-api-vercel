import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { isAuthenticated } from "@/lib/auth";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");

  return (
    <main className="login-shell">
      <section className="login-card">
        <span className="brand">▲</span>
        <p className="eyebrow">OpenAI Agents API × Vercel Sandbox</p>
        <h1>Sign in</h1>
        <p className="login-copy">
          Enter the password configured for this deployment.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
