import type { Context } from "hono";
import type { Env, PublicPrincipal } from "../types";
import { verifyPublicAccessToken } from "./token";
import { resolveIdentityPrincipal } from "./identity";

function bearerToken(c: Context<{ Bindings: Env }>) {
  const header = c.req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

export async function resolvePrincipal(c: Context<{ Bindings: Env }>): Promise<PublicPrincipal | null> {
  const token = bearerToken(c);
  if (!token) return null;
  const claims = await verifyPublicAccessToken(c.env, token);
  return resolveIdentityPrincipal(c.env, claims);
}
