export interface Env {
  DB: D1Database;
  OAUTH_SIGNING_SECRET?: string;
  STUDIO_HANDOFF_SECRET?: string;
  SERVICE_NAME: string;
  SERVICE_ENV: string;
  SERVICE_VERSION?: string;
  GIT_SHA?: string;
}

export interface PublicPrincipal {
  userId: string;
  profileId: string;
  displayName?: string;
  email?: string;
  nickname?: string;
  workspaceId?: string;
  issuer: string;
  subject: string;
  scopes: Set<string>;
}

export type ToolRisk = "read" | "prepare" | "write" | "publish";
export type PublicPluginKey = "agentsam-brand" | "agentsam-campaign" | "agentsam-sales" | "agentsam-remote-desktop-commander" | "agentsam-shared";

export interface PublicPluginToolPermission {
  id: string; plugin: PublicPluginKey; title: string; scopes: readonly string[]; readOnlyHint: boolean;
}

export interface PublicToolDefinition {
  id: string;
  plugin: PublicPluginKey;
  title: string;
  description: string;
  scopes: readonly string[];
  risk: ToolRisk;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
  profile?: boolean;
}
