import type { Env, PublicPrincipal } from "../types";
import { dispatchBrandTool } from "../plugins/brand/handlers";
import { dispatchCampaignTool } from "../plugins/campaign/handlers";

export async function dispatchPublicTool(
  toolId: string,
  args: Record<string, unknown>,
  env: Env,
  principal: PublicPrincipal
): Promise<unknown> {
  if (toolId.startsWith("brand.")) {
    return dispatchBrandTool(toolId, args, env, principal);
  }
  if (toolId.startsWith("campaign.")) {
    return dispatchCampaignTool(toolId, args, env, principal);
  }
  throw new Error("public_tool_dispatch_not_found");
}
