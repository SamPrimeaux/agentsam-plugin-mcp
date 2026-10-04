export interface ResourceConnection {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  providerKey: string;
  capabilities: string[];
  status: "connected" | "degraded" | "disconnected";
}
