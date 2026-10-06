import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PublicAuthError,
  scopesFromPayload,
  verifyPublicAccessToken
} from "../src/auth/token";
import type { Env } from "../src/types";

const env = {
  DB: {} as D1Database,
  SERVICE_NAME: "agentsam-plugin-mcp",
  SERVICE_ENV: "test",
  AGENTSAM_PUBLIC_ISSUER: "https://inneranimalmedia.com",
  AGENTSAM_PUBLIC_AUDIENCE: "https://plugins.inneranimalmedia.com/mcp",
  AGENTSAM_PUBLIC_USERINFO_URL: "https://inneranimalmedia.com/api/oauth/userinfo"
} satisfies Env;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("opaque public OAuth token verification", () => {
  it("accepts IAM userinfo only for the configured public audience", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      sub: "usr_123",
      name: "Review User",
      email: "review@example.com",
      audience: env.AGENTSAM_PUBLIC_AUDIENCE,
      client_id: "iam_dcr_chatgpt",
      scopes: ["profile:read", "brand:read"]
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const payload = await verifyPublicAccessToken(env, "mcp_oauth_demo");
    expect(payload.sub).toBe("usr_123");
    expect(payload.iss).toBe(env.AGENTSAM_PUBLIC_ISSUER);
    expect(payload.aud).toBe(env.AGENTSAM_PUBLIC_AUDIENCE);
    expect([...scopesFromPayload(payload)]).toEqual(["profile:read", "brand:read"]);
  });

  it("rejects a valid upstream token for the private operator resource", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      sub: "usr_123",
      audience: "https://mcp.inneranimalmedia.com/mcp",
      scopes: ["mcp:tools"]
    }), { status: 200, headers: { "content-type": "application/json" } })));

    await expect(verifyPublicAccessToken(env, "mcp_oauth_private"))
      .rejects.toMatchObject({ code: "invalid_token_audience" });
  });

  it("fails closed when IAM rejects the bearer token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ error: "invalid_token" }),
      { status: 401, headers: { "content-type": "application/json" } }
    )));

    await expect(verifyPublicAccessToken(env, "bad"))
      .rejects.toMatchObject({ code: "invalid_token" });
  });
});
