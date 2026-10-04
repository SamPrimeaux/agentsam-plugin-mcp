import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Context } from "hono";
import type { Env, PublicToolDefinition } from "../types";
import { resolvePrincipal } from "../auth/principal";
import { authorizeTool } from "../auth/authorize";
import { PUBLIC_TOOL_CATALOG } from "./catalog";
import { dispatchPublicTool } from "./dispatch";
import { getPublicToolInputSchema } from "./schemas";

function annotations(tool: PublicToolDefinition) {
  return {
    title: tool.title,
    readOnlyHint: tool.readOnlyHint,
    destructiveHint: tool.destructiveHint,
    openWorldHint: tool.openWorldHint
  };
}

function content(payload: unknown) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(payload)
    }]
  };
}

function failure(error: string, details?: unknown) {
  return {
    isError: true as const,
    ...content(details === undefined ? { error } : { error, details })
  };
}

function createServer(c: Context<{ Bindings: Env }>) {
  const server = new McpServer(
    { name: c.env.SERVICE_NAME || "agentsam-plugin-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  for (const tool of PUBLIC_TOOL_CATALOG) {
    server.registerTool(
      tool.id,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: getPublicToolInputSchema(tool.id),
        annotations: annotations(tool)
      },
      async (args) => {
        const principal = await resolvePrincipal(c);
        if (!principal) {
          return failure("authentication_required");
        }

        const auth = authorizeTool(principal, tool);
        if (!auth.ok) {
          return failure(
            auth.error,
            "missing" in auth ? { missing: auth.missing } : undefined
          );
        }

        try {
          return content(await dispatchPublicTool(
            tool.id,
            (args || {}) as Record<string, unknown>,
            c.env,
            principal
          ));
        } catch (error) {
          return failure(error instanceof Error ? error.message : "public_tool_failed");
        }
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

  const server = createServer(c);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
}
