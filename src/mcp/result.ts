import { normalizeError } from "@inneranimalmedia/agentsam-errors";
import type { PublicToolDefinition } from "../types";

export interface PublicToolResultEnvelope {
  ok: boolean;
  capability: string;
  data?: unknown;
  evidence: unknown[];
  confidence: unknown;
  warnings: string[];
  provenance: unknown[];
  error?: { code: string; message: string; recoverable: boolean; missing: string[] };
}

function rows(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function warningRows(value: unknown): string[] { return rows(value).map(String); }

export function successEnvelope(tool: PublicToolDefinition, payload: any): PublicToolResultEnvelope {
  const evidence = Array.isArray(payload?.evidence)
    ? payload.evidence
    : payload?.evidence && typeof payload.evidence === "object"
      ? [payload.evidence]
      : [];
  return {
    ok: true,
    capability: tool.id,
    data: payload,
    evidence,
    confidence: payload?.confidence ?? payload?.evidence_quality ?? payload?.evidence?.summary?.quality ?? null,
    warnings: warningRows(payload?.warnings ?? payload?.missing_evidence),
    provenance: rows(payload?.provenance)
  };
}

export function errorEnvelope(tool: PublicToolDefinition, error: unknown, missing: string[] = []): PublicToolResultEnvelope {
  const normalized = normalizeError(error, {
    tool: tool.id,
    source: { kind: "agentsam", name: "agentsam-plugin-mcp", service: tool.plugin }
  }) as any;
  return {
    ok: false,
    capability: tool.id,
    evidence: [],
    confidence: null,
    warnings: [],
    provenance: [],
    error: {
      code: String(normalized?.reason || normalized?.code || "internal"),
      message: String(normalized?.message || "The AgentSam tool failed."),
      recoverable: Boolean(normalized?.retry?.retryable || normalized?.failure_behavior === "retryable" || missing.length),
      missing
    }
  };
}
