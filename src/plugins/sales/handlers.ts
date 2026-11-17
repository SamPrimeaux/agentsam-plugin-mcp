import { buildSalesContext, getSalesWorkflow } from "../../../packages/agentsam-sales/src/index";
import type { Env, PublicPrincipal } from "../../types";
import { listWorkspaceConnections } from "../../connections/resolver";

function requireWorkspace(principal: PublicPrincipal) {
  if (!principal.workspaceId) throw new Error("workspace_required");
  return principal.workspaceId;
}

function result(capability: string, data: unknown, warnings: string[] = []) {
  return { ok: true, capability, data, evidence: [], confidence: null, warnings, provenance: [] };
}

export async function dispatchSalesTool(toolId: string, args: Record<string, unknown>, env: Env, principal: PublicPrincipal) {
  if (toolId === "sales.get_context") {
    const connections = await listWorkspaceConnections(env, requireWorkspace(principal));
    const context = buildSalesContext(connections);
    const warnings = context.crm.status === "not_connected"
      ? ["No supported CRM connection is registered for this workspace. Use supplied records or other connected sources; do not imply CRM access."] : [];
    return result(toolId, context, warnings);
  }
  if (toolId === "sales.get_workflow") {
    const workflow = getSalesWorkflow(String(args.workflow || ""));
    if (!workflow) throw new Error("sales_workflow_not_found");
    return result(toolId, workflow);
  }
  throw new Error("sales_tool_not_found");
}
