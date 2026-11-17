import type { PublicToolDefinition } from "../../types";

export const SALES_PUBLIC_TOOLS: readonly PublicToolDefinition[] = [
  {
    id: "sales.get_context", plugin: "agentsam-sales", title: "Get sales context",
    description: "List this workspace's connected business sources and available sales workflows. Does not read CRM records or grant new access.",
    scopes: ["sales:read"], risk: "read", readOnlyHint: true, destructiveHint: false, openWorldHint: false
  },
  {
    id: "sales.get_workflow", plugin: "agentsam-sales", title: "Get sales workflow",
    description: "Retrieve an evidence-led playbook for company research, prospect enrichment, account signals, meeting preparation, follow-up, deal strategy, pipeline review, business cases, partners, or leadership review.",
    scopes: ["sales:read"], risk: "read", readOnlyHint: true, destructiveHint: false, openWorldHint: false
  }
];
