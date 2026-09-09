import { isAuthenticated } from "@/lib/auth";
import { createSession } from "@/lib/openai";

export async function POST() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return Response.json(await createSession(), { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not create session" },
      { status: 502 },
    );
  }
}
