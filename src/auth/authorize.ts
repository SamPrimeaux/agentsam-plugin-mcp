import type { PublicPrincipal, PublicToolDefinition } from "../types";

export function authorizeTool(
  principal: PublicPrincipal | null,
  tool: PublicToolDefinition
) {
  if (!principal) return { ok: false as const, error: "authentication_required" };

  const missing = tool.scopes.filter((scope) => !principal.scopes.has(scope));
  if (missing.length) {
    return { ok: false as const, error: "insufficient_scope", missing };
  }

  return { ok: true as const };
}
