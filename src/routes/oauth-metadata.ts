import type { Context } from "hono";
import type { Env } from "../types";

import { PUBLIC_TOOL_CATALOG } from "../mcp/catalog";

export const PUBLIC_SCOPES = [...new Set(["offline_access",...PUBLIC_TOOL_CATALOG.flatMap(t=>t.scopes)])].sort();

export async function oauthProtectedResourceRoute(c: Context<{ Bindings: Env }>) {
  const base = new URL(c.req.url).origin;
  const issuer = base;

  return c.json({
    resource: base + "/mcp",
    authorization_servers: issuer ? [issuer] : [],
    scopes_supported: [...PUBLIC_SCOPES],
    bearer_methods_supported: ["header"],
    resource_documentation: base + "/health"
  });
}
