import { cookies } from "next/headers";

const encoder = new TextEncoder();
const SESSION_PAYLOAD = encoder.encode("openai-agents-api-vercel:authenticated");

export const AUTH_COOKIE_NAME = "openai-agents-api-vercel-session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function appPassword() {
  const value = process.env.APP_PASSWORD;
  if (!value) throw new Error("APP_PASSWORD is not configured");
  return value;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createAuthToken() {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(appPassword()),
    SESSION_PAYLOAD,
  );
  return Buffer.from(signature).toString("base64url");
}

export async function verifyAuthToken(token: string | undefined) {
  if (!token) return false;
  try {
    return crypto.subtle.verify(
      "HMAC",
      await hmacKey(appPassword()),
      Buffer.from(token, "base64url"),
      SESSION_PAYLOAD,
    );
  } catch {
    return false;
  }
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return verifyAuthToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function verifyPassword(candidate: string) {
  try {
    const candidateSignature = await crypto.subtle.sign(
      "HMAC",
      await hmacKey(candidate),
      SESSION_PAYLOAD,
    );
    return crypto.subtle.verify(
      "HMAC",
      await hmacKey(appPassword()),
      candidateSignature,
      SESSION_PAYLOAD,
    );
  } catch {
    return false;
  }
}

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE,
};
