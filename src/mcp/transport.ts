import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import type { Context } from "hono";
import type { Env, PublicToolDefinition } from "../types";
import { resolvePrincipal } from "../auth/principal";
import { authorizeTool } from "../auth/authorize";
import { PUBLIC_TOOL_CATALOG } from "./catalog";

const GENERIC_PUBLIC_INPUT = z.object({}).passthrough();

function toolAnnotations(tool: PublicToolDefinition) {
  return {
    title: tool.title,
    readOnlyHint: tool.readOnlyHint,
    destructiveHint: tool.destructiveHint,
    openWorldHint: tool.openWorldHint
  };
}

function errorResult(code: string, details?: unknown) {
  const payload = details === undefined ? { error: code } : { error: code, details };
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: JSON.stringify(payload) }]
  };
}

function createPublicMcpServer(c: Context<{ Bindings: Env }>) {
  const server = new McpServer(
    {
      name: c.env.SERVICE_NAME || "agentsam-plugin-mcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  for (const tool of PUBLIC_TOOL_CATALOG) {
    server.registerTool(
      tool.id,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: GENERIC_PUBLIC_INPUT,
        annotations: toolAnnotations(tool)
      },
      async (_args) => {
        const principal = await resolvePrincipal(c);
        const authorization = authorizeTool(principal, tool);

        if (!authorization.ok) {
          return errorResult(authorization.error, "missing" in authorization ? {
            missing: authorization.missing
          } : undefined);
        }

        // Transport/catalog/auth boundary is now live. Domain execution is wired
        // separately so this public MCP never grows an accidental generic executor.
        return errorResult("brand_handlers_not_wired", {
          tool: tool.id
        });
      }
    );
  }

  return server;
}

export async function handleMcp(c: Context<{ Bindings: Env }>) {
  if (!["GET", "POST", "DELETE"].includes(c.req.method)) {
    return c.json(
      { ok: false, error: "method_not_allowed" },
      405,
      { Allow: "GET, POST, DELETE" }
    );
  }

  const server = createPublicMcpServer(c);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
}
