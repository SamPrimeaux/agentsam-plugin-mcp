import { z } from "zod";

const JsonObject = z.record(z.string(), z.unknown());

export const CAMPAIGN_TOOL_INPUT_SCHEMAS = {
  "campaign.get_context": z.object({}),
  "campaign.brief.draft": z.object({
    objective: z.string().min(1),
    context: JsonObject,
    audience: z.unknown().optional(),
    offer: z.unknown().optional(),
    successMetrics: z.array(z.string()).optional(),
    assumptions: z.array(z.string()).optional()
  }),
  "campaign.concept.evaluate": z.object({
    concept: JsonObject,
    context: JsonObject
  }),
  "campaign.concepts.rank": z.object({
    concepts: z.array(JsonObject).min(1),
    context: JsonObject
  }),
  "campaign.plan": z.object({
    brief: JsonObject,
    concept: JsonObject,
    context: JsonObject
  }),
  "campaign.brief.save": z.object({
    brief: JsonObject
  }),
  "campaign.concept.save": z.object({
    concept: JsonObject,
    evaluation: JsonObject.optional(),
    briefId: z.string().optional()
  })
} as const;

export function getCampaignInputSchema(toolId: string) {
  return CAMPAIGN_TOOL_INPUT_SCHEMAS[
    toolId as keyof typeof CAMPAIGN_TOOL_INPUT_SCHEMAS
  ];
}
