import { APIError, Sandbox } from "@vercel/sandbox";
import { SANDBOX_TIMEOUT_MS, config } from "@/lib/config";

export const sandboxName = (sessionId: string) => `agents-${sessionId}`;

export async function deleteSandbox(sessionId: string) {
  try {
    const sandbox = await Sandbox.get({ name: sandboxName(sessionId) });
    await sandbox.delete();
  } catch (error) {
    if (error instanceof APIError && error.response.status === 404) return;
    throw error;
  }
}

export async function connectSandbox(
  sessionId: string,
  environmentId: string,
  remoteUrl: string,
) {
  const name = sandboxName(sessionId);
  const sandbox = await Sandbox.getOrCreate({
    name,
    image: "vercel/sandbox/node:24",
    timeout: SANDBOX_TIMEOUT_MS,
    persistent: true,
    networkPolicy: {
      allow: [
        "api.openai.com",
        "codex-cloud-environments.chatgpt.com",
        "registry.npmjs.org",
      ],
    },
  });

  const setup = await sandbox.runCommand({
    cmd: "flock",
    args: [
      "-w",
      "120",
      "/tmp/codex-setup.lock",
      "sh",
      "-c",
      "mkdir -p /workspace && chown ubuntu:ubuntu /workspace && (command -v codex || npm install -g @openai/codex@alpha)",
    ],
    sudo: true,
  });
  if (setup.exitCode !== 0) {
    const stderr = (await setup.stderr()).trim();
    const stdout = (await setup.stdout()).trim();
    throw new Error(
      `Codex executor setup failed (${setup.exitCode}): ${stderr || stdout || "no command output"}`,
    );
  }

  const executor = await sandbox.runCommand({
    cmd: "flock",
    args: [
      "-n",
      "/tmp/codex-executor.lock",
      "codex",
      "exec-server",
      "--remote",
      remoteUrl,
      "--environment-id",
      environmentId,
    ],
    cwd: "/workspace",
    detached: true,
    env: { CODEX_API_KEY: config.executorApiKey },
  });

  return { sandbox, executor };
}
