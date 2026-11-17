import type { PublicToolDefinition } from "../types";
import { PROFILE_PUBLIC_TOOL } from "../plugins/profile/tools";
import { BRAND_PUBLIC_TOOLS } from "../plugins/brand/tools";
import { CAMPAIGN_PUBLIC_TOOLS } from "../plugins/campaign/tools";
import { SALES_PUBLIC_TOOLS } from "../plugins/sales/tools";
import { REMOTE_DESKTOP_COMMANDER_TOOL_PERMISSIONS } from "../../packages/agentsam-remote-desktop-commander/src/index";
import type { PublicPluginToolPermission } from "../types";

export type PublicToolSurface = "all" | "brand" | "campaign" | "sales";

export const PUBLIC_TOOL_CATALOG: readonly PublicToolDefinition[] = [
  PROFILE_PUBLIC_TOOL,
  ...BRAND_PUBLIC_TOOLS,
  ...CAMPAIGN_PUBLIC_TOOLS,
  ...SALES_PUBLIC_TOOLS
];

export const BRAND_TOOL_CATALOG: readonly PublicToolDefinition[] = [
  PROFILE_PUBLIC_TOOL,
  ...BRAND_PUBLIC_TOOLS
];

export const CAMPAIGN_TOOL_CATALOG: readonly PublicToolDefinition[] = [
  PROFILE_PUBLIC_TOOL,
  ...CAMPAIGN_PUBLIC_TOOLS
];

export const SALES_TOOL_CATALOG: readonly PublicToolDefinition[] = [
  PROFILE_PUBLIC_TOOL,
  ...SALES_PUBLIC_TOOLS
];

export const PUBLIC_PLUGIN_TOOL_PERMISSIONS: readonly PublicPluginToolPermission[] = [
  ...PUBLIC_TOOL_CATALOG.map(({ id, plugin, title, scopes, readOnlyHint }) => ({ id, plugin, title, scopes, readOnlyHint })),
  ...REMOTE_DESKTOP_COMMANDER_TOOL_PERMISSIONS.map((tool) => ({ ...tool, plugin: "agentsam-remote-desktop-commander" as const }))
];

export function publicCatalogForSurface(surface: PublicToolSurface) {
  if (surface === "brand") return BRAND_TOOL_CATALOG;
  if (surface === "campaign") return CAMPAIGN_TOOL_CATALOG;
  if (surface === "sales") return SALES_TOOL_CATALOG;
  return PUBLIC_TOOL_CATALOG;
}
