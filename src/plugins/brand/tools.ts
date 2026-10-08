import type { PublicToolDefinition } from "../../types";

export const BRAND_PUBLIC_TOOLS: readonly PublicToolDefinition[] = [
  {
    id: "brand.get_context",
    plugin: "agentsam-brand",
    title: "Get brand context",
    description: "Resolve the user's authorized brand/workspace context without exposing credentials.",
    scopes: ["brand:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "brand.inspect",
    plugin: "agentsam-brand",
    title: "Inspect brand",
    description: "Inspect authorized brand evidence and return structured findings grounded in real assets and content.",
    scopes: ["brand:read", "brand:assets:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "brand.assets.list",
    plugin: "agentsam-brand",
    title: "List brand assets",
    description: "List authorized brand assets with roles, provenance, status, and relevant metadata.",
    scopes: ["brand:assets:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "brand.asset.inspect",
    plugin: "agentsam-brand",
    title: "Inspect brand asset",
    description: "Inspect one authorized brand asset and return deterministic metadata and brand-role evidence.",
    scopes: ["brand:assets:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "brand.usage.find",
    plugin: "agentsam-brand",
    title: "Find brand usage",
    description: "Find authorized places where a brand asset or identity element is currently used.",
    scopes: ["brand:read", "brand:assets:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "brand.contract.draft",
    plugin: "agentsam-brand",
    title: "Draft brand contract",
    description: "Build a draft BrandContract from authorized evidence while separating observed facts, inferences, and proposals.",
    scopes: ["brand:read", "brand:contract:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "brand.consistency.evaluate",
    plugin: "agentsam-brand",
    title: "Evaluate brand consistency",
    description: "Evaluate material against the current BrandContract and supporting evidence.",
    scopes: ["brand:read", "brand:contract:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "brand.contract.save",
    plugin: "agentsam-brand",
    title: "Save approved BrandContract",
    description: "Persist an explicitly reviewed BrandContract as a new workspace version without altering live assets, sites, or published branding.",
    scopes: ["brand:contract:write"],
    risk: "write",
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "brand.plan",
    plugin: "agentsam-brand",
    title: "Build brand plan",
    description: "Produce a structured, non-destructive brand remediation or refinement plan from current findings.",
    scopes: ["brand:read", "brand:contract:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  }
];
