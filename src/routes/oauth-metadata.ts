import type { Context } from "hono";
import type { Env } from "../types";

export async function oauthProtectedResourceRoute(c: Context<{ Bindings: Env }>) {
  const base = c.env.AGENTSAM_PUBLIC_BASE_URL || new URL(c.req.url).origin;
  const issuer = c.env.AGENTSAM_PUBLIC_ISSUER || `${base}/TODO-auth`;

  return c.json({
    resource: `${base}/mcp`,
    authorization_servers: [issuer],
    scopes_supported: [
      "profile:read",
      "brand:read",
      "brand:assets:read",
      "brand:contract:read",
      "brand:contract:write",
      "brand:changes:prepare",
      "brand:changes:apply"
    ],
    _scaffold: true
  });
}
