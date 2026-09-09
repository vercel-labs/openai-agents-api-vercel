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
  const install = await sandbox.runCommand({
    cmd: "npm",
    args: ["install", "-g", "@openai/codex@alpha"],
    sudo: true,
  });
  if (install.exitCode !== 0) throw new Error("Codex installation failed");
  const version = await sandbox.runCommand("codex", ["--version"]);
  const output = await version.stdout();
  console.log(JSON.stringify({ sandbox: sandbox.name, codex: output.trim() }));
} finally {
  await sandbox.stop();
}
