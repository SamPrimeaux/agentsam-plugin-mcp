import type { Env } from "../types";
import type { ResourceConnection } from "./types";

function parseCapabilities(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

export async function listWorkspaceConnections(
  env: Env,
  workspaceId: string
): Promise<ResourceConnection[]> {
  const result = await env.DB.prepare(
    `SELECT id, user_id, workspace_id, provider_key,
            capabilities_json, status
       FROM public_connections
      WHERE workspace_id = ?1
      ORDER BY provider_key, created_at`
  ).bind(workspaceId).all();

  return (result.results ?? []).map((row: any) => ({
    id: String(row.id),
    ownerUserId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    providerKey: String(row.provider_key),
    capabilities: parseCapabilities(row.capabilities_json),
    status:
      row.status === "degraded" || row.status === "disconnected"
        ? row.status
        : "connected"
  }));
}
