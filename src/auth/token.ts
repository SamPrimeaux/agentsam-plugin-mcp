import type { JWTPayload } from "jose";
import type { Env } from "../types";
import { verifyIssuerToken } from "./issuer";

export class PublicAuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "PublicAuthError";
  }
}
export function scopesFromPayload(payload: JWTPayload) {
  const scopes = new Set<string>();
  for (const value of [payload.scope, (payload as any).scp, (payload as any).scopes]) {
    if (typeof value === "string") value.split(/\s+/).filter(Boolean).forEach(s=>scopes.add(s));
    else if (Array.isArray(value)) value.forEach(s=>{if(typeof s==="string") scopes.add(s)});
  }
  return scopes;
}
export async function verifyPublicAccessToken(env: Env, token: string, request: Request): Promise<JWTPayload> {
  try {
    return await verifyIssuerToken(request,env,token);
  } catch {
    throw new PublicAuthError("invalid_token", "The token is invalid, expired, revoked, or bound to a different resource.");
  }
}
