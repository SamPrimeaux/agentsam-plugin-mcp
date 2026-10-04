import type { PublicToolDefinition } from "../types";
import { PROFILE_PUBLIC_TOOL } from "../plugins/profile/tools";
import { BRAND_PUBLIC_TOOLS } from "../plugins/brand/tools";
import { CAMPAIGN_PUBLIC_TOOLS } from "../plugins/campaign/tools";

export type PublicToolSurface = "all" | "brand" | "campaign";

export const PUBLIC_TOOL_CATALOG: readonly PublicToolDefinition[] = [
  PROFILE_PUBLIC_TOOL,
  ...BRAND_PUBLIC_TOOLS,
  ...CAMPAIGN_PUBLIC_TOOLS
];

export const BRAND_TOOL_CATALOG: readonly PublicToolDefinition[] = [
  PROFILE_PUBLIC_TOOL,
  ...BRAND_PUBLIC_TOOLS
];

export const CAMPAIGN_TOOL_CATALOG: readonly PublicToolDefinition[] = [
  PROFILE_PUBLIC_TOOL,
  ...CAMPAIGN_PUBLIC_TOOLS
];

export function publicCatalogForSurface(surface: PublicToolSurface) {
  if (surface === "brand") return BRAND_TOOL_CATALOG;
  if (surface === "campaign") return CAMPAIGN_TOOL_CATALOG;
  return PUBLIC_TOOL_CATALOG;
}
