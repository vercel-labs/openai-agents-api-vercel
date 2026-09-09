# OpenAI Agents API on Vercel

Build and deploy an OpenAI Agents API integration on Vercel. Vercel hosts the web experience and API routes, [Vercel Queues](https://vercel.com/docs/queues) coordinates lifecycle work, and [Vercel Sandbox](https://vercel.com/docs/sandbox) gives each agent session a persistent, isolated execution environment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fopenai-agents-api-vercel&env=OPENAI_API_KEY%2COPENAI_AGENT_ID%2COPENAI_EXECUTOR_API_KEY%2CAPP_PASSWORD&envDescription=Credentials%20and%20an%20application%20password%20for%20the%20OpenAI%20Agents%20API%20demo.%20Add%20the%20webhook%20secret%20after%20the%20first%20deployment.&project-name=openai-agents-api-vercel&repository-name=openai-agents-api-vercel)

## How it works

OpenAI hosts the agent harness, inference loop, and session state. Vercel hosts the user-facing interface and control plane, then supplies the execution environment where the agent reads and writes files and runs commands.

There are two separate paths. The **agent path** carries user input and streamed output between the Vercel application and OpenAI. The **infrastructure path** handles OpenAI's request to connect isolated compute.

During a run:

1. The application creates a self-hosted OpenAI session and sends user input.
2. OpenAI sends a signed webhook when that session needs an executor.
3. The webhook puts the session ID on [Vercel Queues](https://vercel.com/docs/queues).
4. A private consumer reads the latest session state, then creates or resumes its persistent Sandbox.
5. `codex exec-server` connects outbound from the Sandbox to the OpenAI session. The Sandbox needs no public ingress.
6. OpenAI continues the agent loop and streams session events back to the application.

Queue delivery is at least once. Re-reading current session state, `Sandbox.getOrCreate()`, a deterministic Sandbox name, and `flock` guards make retries safe. OpenAI remains the source of truth for session lifecycle, so a durable Workflow would duplicate state without improving this reconciliation path.

This is different from [building an agent with the OpenAI Agents SDK and Vercel Sandbox](https://vercel.com/kb/guide/building-an-agent-with-openai-agents-sdk-and-vercel-sandbox). In that architecture, your application runs the agent loop. Here, OpenAI runs the Codex harness while the Vercel application handles the interface, session APIs, and execution-environment lifecycle.

## Prerequisites

- Access to the OpenAI Agents API and a configured agent ID
- A Vercel project with Functions, Queues, and Sandbox available
- Two OpenAI API keys from the same organization, project, and user or service account:
  - `OPENAI_API_KEY` for the application control plane
  - `OPENAI_EXECUTOR_API_KEY` restricted to **List models → Read**, with every other permission set to **None**

The restricted executor key is the only OpenAI credential passed into the Sandbox. Agent-generated code can read it, so keep the broader application key outside the Sandbox.

## Deploy

Click **Deploy with Vercel** above and configure these variables:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Creates and manages Agents API sessions. |
| `OPENAI_AGENT_ID` | Limits the consumer to sessions for this agent. |
| `OPENAI_EXECUTOR_API_KEY` | Connects `codex exec-server` to the session. Use the restricted key described above. |
| `APP_PASSWORD` | Protects the demo UI and session APIs with a signed, HTTP-only cookie. |

The webhook secret is created only after the deployment has a URL, so webhook setup is a second step:

1. Register `https://<your-deployment>/api/webhook` as the Agents API webhook endpoint.
2. Subscribe to `agent.session.action_required` and `agent.session.failed`.
3. Add the signing secret as `OPENAI_WEBHOOK_SECRET` in Vercel project settings.
4. Redeploy so the Function receives the new variable.

The endpoint returns `503` until the real webhook secret replaces the default `pending-webhook-registration` value.
If Deployment Protection is enabled, append the project's automation bypass
secret to the webhook URL as
`?x-vercel-protection-bypass=<bypass-secret>` so OpenAI can reach it.

The password gate protects the UI and session APIs. It does not wrap the webhook,
which verifies OpenAI's signature, or the Queue consumer, which Vercel invokes
privately. For a production application, replace this shared password with your
identity provider and authorization policy.

## Run locally

Install dependencies and copy the environment template:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Local UI and Agents API routes work normally. Managed queue delivery invokes the provisioning consumer after deployment on Vercel; use a deployed webhook endpoint for the full lifecycle flow.

## API flow

- `POST /api/sessions` creates a self-hosted session with `/workspace` as its working directory.
- `POST /api/sessions/:id/input` opens the event stream before submitting input, then proxies one run until the target turn ends and the session becomes idle.
- `POST /api/webhook` verifies OpenAI's signature and enqueues lifecycle work using the webhook event ID as its idempotency key.
- `POST /api/queues/provision` is the private queue consumer that creates or reconnects the Sandbox.
- `DELETE /api/sessions/:id` deletes both the OpenAI session and its Sandbox.

The page and every `/api/sessions` Route Handler require a valid signed session
cookie. `/api/auth/login` exchanges `APP_PASSWORD` for the cookie, and
`/api/auth/logout` clears it.

The project keeps a small `vercel.json` because Queue push consumers require a
deploy-time `queue/v2beta` trigger. `handleCallback()` processes Queue delivery,
while the trigger subscribes the private Function to `sandbox-wakeup`. Function
duration for the provisioning consumer remains next to its implementation as a
route-level `maxDuration` export.

## Network policy and cleanup

The Sandbox allows outbound access only to:

- `api.openai.com` to register the executor
- `codex-cloud-environments.chatgpt.com` for commands and results
- `registry.npmjs.org` to install the alpha Codex CLI

For production, bake the Codex CLI and application dependencies into a custom image, then remove the npm registry from the allowlist. The sample uses the Vercel-managed Node 24 image and a 30-minute Sandbox timeout. Sandboxes are persistent so the same session can reconnect without losing its filesystem; deleting the session through the demo also deletes its Sandbox.

## Verify

```bash
pnpm test
pnpm build
pnpm probe:sandbox
```

The probe creates a real Sandbox, installs the alpha Codex CLI, prints its version, and stops the Sandbox. A complete agent run additionally requires the OpenAI variables and registered webhook described above.
