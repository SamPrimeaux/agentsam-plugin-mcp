export type EvidenceKind =
  | "brand"
  | "product"
  | "inventory"
  | "audience"
  | "performance"
  | "search"
  | "content";

export interface EvidenceProvenance {
  providerKey: string;
  resource?: string;
  externalId?: string;
}

export interface PublicEvidenceRecord<T = unknown> {
  kind: EvidenceKind;
  source: string;
  observedAt: string | null;
  freshness: "fresh" | "aging" | "stale" | "unknown";
  confidence: number | null;
  authority: "canonical" | "primary" | "secondary" | "inferred" | "unknown";
  connectionId: string;
  provenance: EvidenceProvenance[];
  data?: T;
}

export interface ResourceConnection {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  providerKey: string;
  connectionKind: string;
  capabilities: string[];
  metadata: Record<string, unknown>;
  status: "connected" | "degraded" | "disconnected";
}
