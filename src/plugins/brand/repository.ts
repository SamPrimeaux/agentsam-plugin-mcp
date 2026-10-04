import type { Env, PublicPrincipal } from "../../types";
import { listWorkspaceConnections } from "../../connections/resolver";

function parseJson(value: unknown) {
  if (typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
}

export async function getBrandContext(env: Env, principal: PublicPrincipal) {
  if (!principal.workspaceId) {
    return {
      userId: principal.userId,
      workspace: null,
      connections: [],
      latestContract: null
    };
  }

  const workspace = await env.DB.prepare(
    `SELECT id, display_name, slug, created_at, updated_at
       FROM public_workspaces WHERE id = ?1 LIMIT 1`
  ).bind(principal.workspaceId).first();

  const latest = await env.DB.prepare(
    `SELECT id, schema_version, status, contract_json, evidence_json,
            created_at, updated_at
       FROM public_brand_contracts
      WHERE workspace_id = ?1
      ORDER BY updated_at DESC
      LIMIT 1`
  ).bind(principal.workspaceId).first();

  return {
    userId: principal.userId,
    workspace,
    connections: await listWorkspaceConnections(env, principal.workspaceId),
    latestContract: latest ? {
      ...latest,
      contract: parseJson(latest.contract_json),
      evidence: parseJson(latest.evidence_json)
    } : null
  };
}
