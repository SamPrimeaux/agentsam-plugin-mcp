import type { Context } from "hono";
import type { Env } from "../types";

export async function healthRoute(c: Context<{ Bindings: Env }>) {
  const authConfigured = Boolean(
    c.env.AGENTSAM_PUBLIC_ISSUER &&
    c.env.AGENTSAM_PUBLIC_AUDIENCE &&
    c.env.AGENTSAM_PUBLIC_JWKS_URL
  );

  return c.json({
    service: c.env.SERVICE_NAME || "agentsam-plugin-mcp",
    version: c.env.SERVICE_VERSION || "0.2.0",
    git_sha: c.env.GIT_SHA || null,
    environment: c.env.SERVICE_ENV || "unknown",
    protocol: "mcp-streamable-http",
    mcp_sdk: "v2",
    healthy: true,
    public_boundary: true,
    auth: {
      configured: authConfigured,
      mode: "oauth-2.1-resource-server"
    },
    plugins: {
      brand: { endpoint: "/mcp/brand", exposed: true },
      campaign: { endpoint: "/mcp/campaign", exposed: true },
      combined: { endpoint: "/mcp", exposed: true }
    }
  });
}
