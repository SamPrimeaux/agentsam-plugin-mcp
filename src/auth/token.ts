import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Env } from "../types";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export class PublicAuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "PublicAuthError";
  }
}

function jwksFor(url: string) {
  let keySet = jwksCache.get(url);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL(url));
    jwksCache.set(url, keySet);
  }
  return keySet;
}

export function scopesFromPayload(payload: JWTPayload) {
  const scopes = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string") {
      for (const scope of value.split(/\s+/).filter(Boolean)) scopes.add(scope);
    } else if (Array.isArray(value)) {
      for (const scope of value) if (typeof scope === "string") scopes.add(scope);
    }
  };
  add(payload.scope);
  add((payload as any).scp);
  return scopes;
}

export async function verifyPublicAccessToken(env: Env, token: string) {
  const issuer = env.AGENTSAM_PUBLIC_ISSUER?.trim();
  const audience = env.AGENTSAM_PUBLIC_AUDIENCE?.trim();
  const jwksUrl = env.AGENTSAM_PUBLIC_JWKS_URL?.trim();
  if (!issuer || !audience || !jwksUrl) {
    throw new PublicAuthError("oauth_not_configured", "Public OAuth settings are incomplete.");
  }
  try {
    const verified = await jwtVerify(token, jwksFor(jwksUrl), { issuer, audience });
    if (!verified.payload.sub) {
      throw new PublicAuthError("invalid_token", "The access token has no subject.");
    }
    return verified.payload;
  } catch (error) {
    if (error instanceof PublicAuthError) throw error;
    throw new PublicAuthError("invalid_token", "The access token is invalid or expired.");
  }
}
