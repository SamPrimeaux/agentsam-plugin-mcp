import type { Env } from "../types";
import type { PublicEvidenceRecord, ResourceConnection } from "./types";

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function listWorkspaceConnections(env: Env, workspaceId: string): Promise<ResourceConnection[]> {
  const sql = "SELECT id, user_id, workspace_id, provider_key, connection_kind, capabilities_json, metadata_json, status FROM public_connections WHERE workspace_id = ?1 ORDER BY provider_key, created_at";
  const result = await env.DB.prepare(sql).bind(workspaceId).all();
  return (result.results ?? []).map((row: any) => ({
    id: String(row.id),
    ownerUserId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    providerKey: String(row.provider_key),
    connectionKind: String(row.connection_kind),
    capabilities: parseJson<string[]>(row.capabilities_json, []).map(String),
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    status: row.status === "degraded" || row.status === "disconnected" ? row.status : "connected"
  }));
}

function evidenceKind(capability: string): PublicEvidenceRecord["kind"] | null {
  const key = capability.toLowerCase();
  if (key.includes("brand")) return "brand";
  if (key.includes("product") || key.includes("catalog")) return "product";
  if (key.includes("inventory")) return "inventory";
  if (key.includes("audience") || key.includes("customer")) return "audience";
  if (key.includes("performance") || key.includes("analytics")) return "performance";
  if (key.includes("search") || key.includes("seo")) return "search";
  if (key.includes("content") || key.includes("media")) return "content";
  return null;
}

export function connectionEvidenceSummary(connections: ResourceConnection[]): PublicEvidenceRecord[] {
  return connections.flatMap((connection) => connection.capabilities.flatMap((capability) => {
    const kind = evidenceKind(capability);
    if (!kind) return [];
    const metadata = connection.metadata || {};
    return [{
      kind,
      source: connection.providerKey,
      observedAt: typeof metadata.observed_at === "string" ? metadata.observed_at : typeof metadata.observedAt === "string" ? metadata.observedAt : null,
      freshness: metadata.freshness === "fresh" || metadata.freshness === "aging" || metadata.freshness === "stale" ? metadata.freshness : "unknown",
      confidence: typeof metadata.confidence === "number" ? Math.max(0, Math.min(1, metadata.confidence)) : null,
      authority: metadata.authority === "canonical" || metadata.authority === "primary" || metadata.authority === "secondary" || metadata.authority === "inferred" ? metadata.authority : "unknown",
      connectionId: connection.id,
      provenance: [{
        providerKey: connection.providerKey,
        resource: typeof metadata.resource === "string" ? metadata.resource : capability,
        externalId: typeof metadata.external_id === "string" ? metadata.external_id : undefined
      }],
      data: metadata.data
    } satisfies PublicEvidenceRecord];
  }));
}
