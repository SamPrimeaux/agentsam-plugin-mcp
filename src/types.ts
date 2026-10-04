export interface Env {
  DB: D1Database;
  SERVICE_NAME: string;
  SERVICE_ENV: string;
  SERVICE_VERSION?: string;
  GIT_SHA?: string;
  AGENTSAM_PUBLIC_ISSUER?: string;
  AGENTSAM_PUBLIC_AUDIENCE?: string;
  AGENTSAM_PUBLIC_JWKS_URL?: string;
  AGENTSAM_PUBLIC_BASE_URL?: string;
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
export type PublicPluginKey = "agentsam-brand" | "agentsam-campaign" | "agentsam-shared";

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
