import type { PublicToolDefinition } from "../../types";

export const CAMPAIGN_PUBLIC_TOOLS: readonly PublicToolDefinition[] = [
  {
    id: "campaign.get_context",
    plugin: "agentsam-campaign-studio",
    title: "Get campaign context",
    description: "Resolve the authorized BrandContract and current campaign workspace context.",
    scopes: ["campaign:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "campaign.brief.draft",
    plugin: "agentsam-campaign-studio",
    title: "Draft campaign brief",
    description: "Build a grounded campaign brief from brand, product, inventory, audience, and commercial evidence.",
    scopes: ["campaign:read"],
    risk: "prepare",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "campaign.concept.evaluate",
    plugin: "agentsam-campaign-studio",
    title: "Evaluate campaign concept",
    description: "Evaluate one proposed concept against authorized evidence without promising outcomes.",
    scopes: ["campaign:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "campaign.concepts.rank",
    plugin: "agentsam-campaign-studio",
    title: "Rank campaign concepts",
    description: "Rank proposed concepts using deterministic evidence-backed dimensions.",
    scopes: ["campaign:read"],
    risk: "read",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "campaign.plan",
    plugin: "agentsam-campaign-studio",
    title: "Build campaign plan",
    description: "Build a review-gated campaign plan from a brief, selected concept, and evidence.",
    scopes: ["campaign:read"],
    risk: "prepare",
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "campaign.brief.save",
    plugin: "agentsam-campaign-studio",
    title: "Save campaign brief",
    description: "Save an explicitly approved campaign brief to the current workspace.",
    scopes: ["campaign:brief:write"],
    risk: "write",
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false
  },
  {
    id: "campaign.concept.save",
    plugin: "agentsam-campaign-studio",
    title: "Save campaign concept",
    description: "Save an explicitly approved campaign concept and optional evaluation.",
    scopes: ["campaign:concept:write"],
    risk: "write",
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false
  }
];
