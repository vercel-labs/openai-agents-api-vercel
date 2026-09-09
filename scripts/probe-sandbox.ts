import { Sandbox } from "@vercel/sandbox";

const credentials =
  process.env.VERCEL_TOKEN &&
  process.env.VERCEL_PROJECT_ID &&
  process.env.VERCEL_TEAM_ID
    ? {
        token: process.env.VERCEL_TOKEN,
        projectId: process.env.VERCEL_PROJECT_ID,
        teamId: process.env.VERCEL_TEAM_ID,
      }
    : {};

const sandbox = await Sandbox.create({
  ...credentials,
  image: "vercel/sandbox/node:24",
  timeout: 10 * 60_000,
  networkPolicy: { allow: ["registry.npmjs.org"] },
});

try {
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
    throw new Error(
      `Codex setup failed (${setup.exitCode}): ${await setup.stderr()}`,
    );
  }
  const version = await sandbox.runCommand("codex", ["--version"]);
  const output = await version.stdout();
  console.log(JSON.stringify({ sandbox: sandbox.name, codex: output.trim() }));
} finally {
  await sandbox.stop();
}
