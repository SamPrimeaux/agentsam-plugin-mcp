import type { Context } from "hono";
import type { Env, PublicPrincipal } from "../types";

export async function resolvePrincipal(
  _c: Context<{ Bindings: Env }>
): Promise<PublicPrincipal | null> {
  // TODO: validate public MCP OAuth token issuer/audience/expiry/scopes.
  // Do not shortcut this to company-internal IAM.
  return null;
}
