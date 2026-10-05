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
  add((payload as any).scopes);
  return scopes;
}

async function verifyOpaqueToken(env: Env, token: string): Promise<JWTPayload> {
  const issuer = env.AGENTSAM_PUBLIC_ISSUER?.trim();
  const audience = env.AGENTSAM_PUBLIC_AUDIENCE?.trim();
  const userinfoUrl = env.AGENTSAM_PUBLIC_USERINFO_URL?.trim();
  if (!issuer || !audience || !userinfoUrl) {
    throw new PublicAuthError("oauth_not_configured", "Public OAuth settings are incomplete.");
  }

  let response: Response;
  try {
    response = await fetch(userinfoUrl, {
      method: "GET",
      headers: {
        authorization: "Bearer " + token,
        accept: "application/json"
      },
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    throw new PublicAuthError("oauth_upstream_unavailable", "The authorization server is unavailable.");
  }

  if (!response.ok) {
    throw new PublicAuthError("invalid_token", "The access token is invalid or expired.");
  }

  const body = await response.json().catch(() => null) as any;
  if (!body || typeof body !== "object" || typeof body.sub !== "string" || !body.sub.trim()) {
    throw new PublicAuthError("invalid_token", "The authorization server returned an invalid subject.");
  }
  if (String(body.audience || "") !== audience) {
    throw new PublicAuthError("invalid_token_audience", "The access token was not issued for this AgentSam resource.");
  }

  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter((scope: unknown) => typeof scope === "string")
    : typeof body.scope === "string"
      ? body.scope.split(/\s+/).filter(Boolean)
      : [];

  return {
    iss: issuer,
    sub: body.sub,
    aud: audience,
    name: typeof body.name === "string" ? body.name : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    ...(typeof body.nickname === "string" ? { nickname: body.nickname } : {}),
    ...(typeof body.workspace_id === "string" && body.workspace_id
      ? { workspace_id: body.workspace_id }
      : {}),
    scope: scopes
  } as JWTPayload;
}

async function verifyJwtToken(env: Env, token: string): Promise<JWTPayload> {
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

export async function verifyPublicAccessToken(env: Env, token: string) {
  if (env.AGENTSAM_PUBLIC_USERINFO_URL?.trim()) {
    return verifyOpaqueToken(env, token);
  }
  return verifyJwtToken(env, token);
}
