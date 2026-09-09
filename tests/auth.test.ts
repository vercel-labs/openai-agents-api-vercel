import { afterEach, describe, expect, it } from "vitest";
import { createAuthToken, verifyAuthToken, verifyPassword } from "@/lib/auth";

const originalPassword = process.env.APP_PASSWORD;

afterEach(() => {
  if (originalPassword === undefined) delete process.env.APP_PASSWORD;
  else process.env.APP_PASSWORD = originalPassword;
});

describe("password authentication", () => {
  it("accepts the configured password and rejects another value", async () => {
    process.env.APP_PASSWORD = "correct horse battery staple";

    await expect(verifyPassword("correct horse battery staple")).resolves.toBe(true);
    await expect(verifyPassword("incorrect")).resolves.toBe(false);
  });

  it("accepts its signed session token and rejects a changed token", async () => {
    process.env.APP_PASSWORD = "correct horse battery staple";
    const token = await createAuthToken();

    await expect(verifyAuthToken(token)).resolves.toBe(true);
    await expect(verifyAuthToken(`${token}changed`)).resolves.toBe(false);
  });
});
