import type { Env } from "../types";
import type { ResourceConnection } from "./types";

export async function listWorkspaceConnections(
  _env: Env,
  _workspaceId: string
): Promise<ResourceConnection[]> {
  return [];
}
