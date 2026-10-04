import type { Context } from "hono";
import type { Env } from "../types";
import { PUBLIC_TOOL_CATALOG } from "./catalog";

/**
 * Next implementation pass:
 * - instantiate the official @modelcontextprotocol/sdk McpServer
 * - register ONLY PUBLIC_TOOL_CATALOG
 * - resolve and authorize principal for protected tool calls
 * - wire Streamable HTTP transport
 * - return structured results that work without UI
 */
export async function handleMcp(c: Context<{ Bindings: Env }>) {
  if (c.req.method === "GET") {
    return c.json({
      ok: true,
      protocol: "mcp",
      transport: "streamable-http",
      status: "scaffold",
      public_tools: PUBLIC_TOOL_CATALOG.map((tool) => tool.id)
    });
  }

  return c.json({
    ok: false,
    error: "mcp_transport_not_wired",
    message: "Wire the official MCP Streamable HTTP transport before connecting a client."
  }, 501);
}
