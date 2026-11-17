import { z } from "zod";

const workflows = [
  "company_research", "prospect_enrichment", "account_signals", "meeting_preparation",
  "call_follow_up", "deal_strategy", "pipeline_review", "business_case",
  "partner_channel_research", "sales_leadership_review"
] as const;

export function getSalesInputSchema(toolId: string) {
  if (toolId === "sales.get_context") return z.object({}).strict();
  if (toolId === "sales.get_workflow") return z.object({ workflow: z.enum(workflows) }).strict();
  return null;
}
