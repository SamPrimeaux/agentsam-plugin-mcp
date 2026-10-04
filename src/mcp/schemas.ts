import { z } from "zod";
import { getBrandInputSchema } from "../plugins/brand/schemas";
import { getCampaignInputSchema } from "../plugins/campaign/schemas";

const EMPTY = z.object({});

export function getPublicToolInputSchema(toolId: string) {
  if (toolId.startsWith("brand.")) {
    return getBrandInputSchema(toolId) || EMPTY;
  }
  if (toolId.startsWith("campaign.")) {
    return getCampaignInputSchema(toolId) || EMPTY;
  }
  return EMPTY;
}
