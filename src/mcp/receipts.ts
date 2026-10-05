import type { Env, PublicPrincipal, PublicToolDefinition } from "../types";

async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value ?? {}));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface ToolReceipt { id: string; startedAt: number; }

export async function beginToolReceipt(env: Env, principal: PublicPrincipal, tool: PublicToolDefinition, args: unknown, requestId?: string): Promise<ToolReceipt> {
  const id = "receipt_" + crypto.randomUUID();
  const startedAt = Date.now();
  const sql = "INSERT INTO public_tool_receipts (id, user_id, workspace_id, plugin_key, tool_id, risk, status, request_id, metadata_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'running', ?7, ?8, unixepoch())";
  await env.DB.prepare(sql).bind(
    id,
    principal.userId,
    principal.workspaceId || null,
    tool.plugin,
    tool.id,
    tool.risk,
    requestId || null,
    JSON.stringify({ input_hash: await sha256(args), principal_profile_id: principal.profileId })
  ).run();
  return { id, startedAt };
}

export async function finishToolReceipt(env: Env, receipt: ToolReceipt, status: "succeeded" | "failed", errorCode?: string) {
  const sql = "UPDATE public_tool_receipts SET status = ?2, error_code = ?3, completed_at = unixepoch(), metadata_json = json_set(COALESCE(metadata_json, '{}'), '$.duration_ms', ?4, '$.result_status', ?2) WHERE id = ?1";
  await env.DB.prepare(sql).bind(receipt.id, status, errorCode || null, Math.max(0, Date.now() - receipt.startedAt)).run();
}
