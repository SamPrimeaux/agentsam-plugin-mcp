export interface Env {
  DB: D1Database;
  SERVICE_NAME: string;
  SERVICE_ENV: string;
  AGENTSAM_PUBLIC_ISSUER?: string;
  AGENTSAM_PUBLIC_AUDIENCE?: string;
  AGENTSAM_PUBLIC_BASE_URL?: string;
}

export interface PublicPrincipal {
  userId: string;
  displayName?: string;
  workspaceId?: string;
  scopes: Set<string>;
}

export type ToolRisk = "read" | "prepare" | "write" | "publish";

export interface PublicToolDefinition {
  id: string;
  plugin: string;
  title: string;
  description: string;
  scopes: readonly string[];
  risk: ToolRisk;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
}
