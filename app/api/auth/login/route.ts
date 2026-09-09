import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  createAuthToken,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: unknown;
  } | null;

  if (typeof body?.password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  if (!process.env.APP_PASSWORD) {
    return NextResponse.json(
      { error: "APP_PASSWORD is not configured" },
      { status: 503 },
    );
  }

  if (!(await verifyPassword(body.password))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, await createAuthToken(), authCookieOptions);
  return response;
}
