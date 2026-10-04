import type { Context } from "hono";
import type { Env } from "../types";

export const PUBLIC_SCOPES = [
  "profile:read",
  "brand:read",
  "brand:assets:read",
  "brand:contract:read",
  "brand:contract:write",
  "brand:changes:prepare",
  "campaign:read",
  "campaign:brief:write",
  "campaign:concept:write"
] as const;

export async function oauthProtectedResourceRoute(c: Context<{ Bindings: Env }>) {
  const base = (c.env.AGENTSAM_PUBLIC_BASE_URL || new URL(c.req.url).origin).replace(/\/$/, "");
  const issuer = c.env.AGENTSAM_PUBLIC_ISSUER?.trim();

  return c.json({
    resource: base + "/mcp",
    authorization_servers: issuer ? [issuer] : [],
    scopes_supported: [...PUBLIC_SCOPES],
    bearer_methods_supported: ["header"],
    resource_documentation: base + "/health"
  });
}
