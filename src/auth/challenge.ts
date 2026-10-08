import type { Context } from "hono";
import type { Env } from "../types";

export function resourceMetadataUrl(c: Context<{ Bindings: Env }>) {
  const base = new URL(c.req.url).origin.replace(/\/$/, "");
  return base + "/.well-known/oauth-protected-resource";
}

export function authChallenge(
  c: Context<{ Bindings: Env }>,
  error: "invalid_token" | "insufficient_scope" | "authentication_required",
  description: string,
  scopes: readonly string[] = []
) {
  const parts = [
    "Bearer resource_metadata=\"" + resourceMetadataUrl(c) + "\"",
    "error=\"" + error + "\"",
    "error_description=\"" + description.replace(/\"/g, "'") + "\""
  ];
  if (scopes.length) parts.push("scope=\"" + scopes.join(" ") + "\"");
  return parts.join(", ");
}
