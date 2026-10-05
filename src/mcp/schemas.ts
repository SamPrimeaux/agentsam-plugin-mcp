import { z } from "zod";
import { getBrandInputSchema } from "../plugins/brand/schemas";
import { getCampaignInputSchema } from "../plugins/campaign/schemas";

const EMPTY = z.object({});

export const PUBLIC_RESULT_SCHEMA = z.object({
  ok: z.boolean(),
  capability: z.string(),
  data: z.unknown().optional(),
  evidence: z.array(z.unknown()),
  confidence: z.unknown().nullable(),
  warnings: z.array(z.string()),
  provenance: z.array(z.unknown()),
  error: z.object({
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean(),
    missing: z.array(z.string())
  }).optional()
});

export const PROFILE_OUTPUT_SCHEMA = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  email: z.string().optional(),
  nickname: z.string().optional()
}).strict();

export function getPublicToolInputSchema(toolId: string) {
  if (toolId === "agentsam.profile") return EMPTY;
  if (toolId.startsWith("brand.")) return getBrandInputSchema(toolId) || EMPTY;
  if (toolId.startsWith("campaign.")) return getCampaignInputSchema(toolId) || EMPTY;
  return EMPTY;
}

export function getPublicToolOutputSchema(toolId: string) {
  return toolId === "agentsam.profile" ? PROFILE_OUTPUT_SCHEMA : PUBLIC_RESULT_SCHEMA;
}
