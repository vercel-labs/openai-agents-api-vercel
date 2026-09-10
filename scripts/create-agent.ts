import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("Set OPENAI_API_KEY before creating an agent");

const client = new OpenAI({ apiKey });
const agent = await client.beta.agents.create({
  name: "Vercel coding agent",
  model: "gpt-5.6",
  instructions:
    "Help users build software. Use the workspace to create files and run commands when needed.",
});

console.log(agent.id);
