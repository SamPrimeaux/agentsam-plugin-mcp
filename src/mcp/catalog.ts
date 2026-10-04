import type { PublicToolDefinition } from "../types";
import { BRAND_PUBLIC_TOOLS } from "../plugins/brand/tools";

// Explicit PUBLIC allowlist. Never auto-import internal AgentSam tools.
export const PUBLIC_TOOL_CATALOG: readonly PublicToolDefinition[] = [
  ...BRAND_PUBLIC_TOOLS
];
