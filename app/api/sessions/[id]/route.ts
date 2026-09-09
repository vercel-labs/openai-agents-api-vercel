import { isAuthenticated } from "@/lib/auth";
import { deleteSession, getSession } from "@/lib/openai";
import { deleteSandbox } from "@/lib/sandbox";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return Response.json(await getSession((await params).id));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not retrieve session" },
      { status: 502 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const results = await Promise.allSettled([deleteSession(id), deleteSandbox(id)]);
  const rejected = results.find((result) => result.status === "rejected");
  if (rejected?.status === "rejected") {
    console.error(rejected.reason);
    return Response.json({ error: "Cleanup did not complete" }, { status: 502 });
  }
  return Response.json({ deleted: true, session_id: id });
}
