import type { JWTPayload } from "jose";
import type { Env, PublicPrincipal } from "../types";
import { PublicAuthError, scopesFromPayload } from "./token";

async function stableId(prefix: string, value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return prefix + "_" + hex.slice(0, 24);
}

export async function resolveIdentityPrincipal(env: Env, payload: JWTPayload): Promise<PublicPrincipal> {
  const issuer = String(payload.iss || env.AGENTSAM_PUBLIC_ISSUER || "");
  const subject = String(payload.sub || "");
  const providerKey = "oauth:" + issuer;
  const proposedProfileId = await stableId("prf", issuer + "|" + subject);
  const proposedUserId = await stableId("usr", issuer + "|" + subject);
  const proposedWorkspaceId = await stableId("ws", issuer + "|" + subject);
  const displayName = typeof payload.name === "string" ? payload.name : typeof (payload as any).nickname === "string" ? String((payload as any).nickname) : undefined;
  const email = typeof payload.email === "string" ? payload.email : undefined;

  const existing = await env.DB.prepare(
    "SELECT id AS identity_id, user_id FROM public_identities WHERE provider_key = ?1 AND provider_subject = ?2 LIMIT 1"
  ).bind(providerKey, subject).first<any>();

  const userId = existing?.user_id ? String(existing.user_id) : proposedUserId;
  const profileId = existing?.identity_id ? String(existing.identity_id) : proposedProfileId;
  const emailVerified = (payload as any).email_verified === true ? 1 : 0;

  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO public_users (id, display_name, created_at, updated_at) VALUES (?1, ?2, unixepoch(), unixepoch())").bind(userId, displayName || null),
    env.DB.prepare("INSERT OR IGNORE INTO public_identities (id, user_id, provider_key, provider_subject, email, email_verified, metadata_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, unixepoch(), unixepoch())").bind(profileId, userId, providerKey, subject, email || null, emailVerified, JSON.stringify({ issuer })),
    env.DB.prepare("INSERT OR IGNORE INTO public_workspaces (id, owner_user_id, display_name, slug, created_at, updated_at) VALUES (?1, ?2, ?3, NULL, unixepoch(), unixepoch())").bind(proposedWorkspaceId, userId, displayName ? displayName + " workspace" : "My AgentSam workspace"),
    env.DB.prepare("UPDATE public_users SET display_name = COALESCE(?2, display_name), updated_at = unixepoch() WHERE id = ?1").bind(userId, displayName || null),
    env.DB.prepare("UPDATE public_identities SET email = COALESCE(?2, email), email_verified = CASE WHEN ?3 = 1 THEN 1 ELSE email_verified END, updated_at = unixepoch() WHERE id = ?1").bind(profileId, email || null, emailVerified)
  ]);

  const requestedWorkspace = typeof (payload as any).workspace_id === "string" ? String((payload as any).workspace_id) : null;
  let workspaceId: string | undefined;
  if (requestedWorkspace) {
    const owned = await env.DB.prepare("SELECT id FROM public_workspaces WHERE id = ?1 AND owner_user_id = ?2 LIMIT 1").bind(requestedWorkspace, userId).first<any>();
    if (!owned) throw new PublicAuthError("workspace_not_authorized", "The requested workspace is not authorized for this identity.");
    workspaceId = String(owned.id);
  } else {
    const workspace = await env.DB.prepare("SELECT id FROM public_workspaces WHERE owner_user_id = ?1 ORDER BY created_at LIMIT 1").bind(userId).first<any>();
    workspaceId = workspace?.id ? String(workspace.id) : proposedWorkspaceId;
  }

  return {
    userId,
    profileId,
    displayName,
    email,
    nickname: typeof (payload as any).nickname === "string" ? String((payload as any).nickname) : displayName,
    workspaceId,
    issuer,
    subject,
    scopes: scopesFromPayload(payload)
  };
}
