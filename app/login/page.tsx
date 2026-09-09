import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { isAuthenticated } from "@/lib/auth";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");

  return (
    <main className="login-shell">
      <section className="login-card">
        <svg
          aria-label="Vercel"
          className="vercel-logo"
          role="img"
          viewBox="0 0 16 14"
        >
          <path d="M8 0 16 14H0L8 0Z" fill="currentColor" />
        </svg>
        <h1>Sign in</h1>
        <p className="login-copy">
          Enter the password configured for this deployment.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
