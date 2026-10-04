import type { PublicToolDefinition } from "../../types";

export const PROFILE_PUBLIC_TOOL: PublicToolDefinition = {
  id: "agentsam.profile",
  plugin: "agentsam-shared",
  title: "Get connected AgentSam profile",
  description: "Return the profile represented by the authenticated AgentSam credentials so the user can distinguish connected accounts.",
  scopes: ["profile:read"],
  risk: "read",
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  profile: true
};
