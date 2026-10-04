import { McpServer, WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import type { Context } from "hono";
import type { Env, PublicToolDefinition } from "../types";
import { PublicAuthError } from "../auth/token";
import { authChallenge } from "../auth/challenge";
import { resolvePrincipal } from "../auth/principal";
import { authorizeTool } from "../auth/authorize";
import { publicCatalogForSurface, type PublicToolSurface } from "./catalog";
import { dispatchPublicTool } from "./dispatch";
import { getPublicToolInputSchema, getPublicToolOutputSchema } from "./schemas";
import { errorEnvelope, successEnvelope } from "./result";
import { beginToolReceipt, finishToolReceipt } from "./receipts";

function annotations(tool: PublicToolDefinition) {
  return {
    title: tool.title,
    readOnlyHint: tool.readOnlyHint,
    destructiveHint: tool.destructiveHint,
    openWorldHint: tool.openWorldHint
  };
}

function securitySchemes(tool: PublicToolDefinition) {
  return [{ type: "oauth2", scopes: [...tool.scopes] }];
}

function descriptorMeta(tool: PublicToolDefinition) {
  return {
    securitySchemes: securitySchemes(tool),
    ...(tool.profile ? { "openai/profile": true } : {})
  };
}

function textAndStructured(structuredContent: Record<string, unknown>, isError = false, meta?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
    ...(meta ? { _meta: meta } : {}),
    ...(isError ? { isError: true as const } : {})
  };
}

function authFailure(
  c: Context<{ Bindings: Env }>,
  tool: PublicToolDefinition,
  code: "authentication_required" | "invalid_token" | "insufficient_scope",
  message: string,
  missing: string[] = []
) {
  const envelope = errorEnvelope(tool, new Error(message), missing);
  envelope.error = {
    code,
    message,
    recoverable: true,
    missing
  };
  const challenge = authChallenge(c, code, message, missing.length ? missing : tool.scopes);
  return textAndStructured(envelope as unknown as Record<string, unknown>, true, {
    "mcp/www_authenticate": [challenge]
  });
}

function createServer(c: Context<{ Bindings: Env }>, surface: PublicToolSurface) {
  const version = c.env.SERVICE_VERSION || "0.2.0";
  const server = new McpServer(
    {
      name: surface === "brand" ? "agentsam-brand" : surface === "campaign" ? "agentsam-campaign" : (c.env.SERVICE_NAME || "agentsam-plugin-mcp"),
      version
    },
    {
      capabilities: { tools: {} },
      instructions:
        surface === "brand"
          ? "Use Brand tools to inspect, define, review, and plan brand work from observed evidence. Never silently redefine canonical BrandContract state."
          : surface === "campaign"
            ? "Use Campaign tools for evidence-backed campaign decisions. Distinguish observed, inferred, estimated, missing, and proposed evidence; never guarantee outcomes."
            : "Public least-privilege AgentSam capability plane. Use only user-recognizable Brand and Campaign operations; private operator capabilities are not available here."
    }
  );

  for (const tool of publicCatalogForSurface(surface)) {
    server.registerTool(
      tool.id,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: getPublicToolInputSchema(tool.id) as any,
        outputSchema: getPublicToolOutputSchema(tool.id) as any,
        annotations: annotations(tool),
        _meta: descriptorMeta(tool)
      },
      async (args: any) => {
        let principal;
        try {
          principal = await resolvePrincipal(c);
        } catch (error) {
          const code = error instanceof PublicAuthError && error.code === "oauth_not_configured"
            ? "invalid_token"
            : "invalid_token";
          return authFailure(c, tool, code, error instanceof Error ? error.message : "Authentication failed.");
        }

        if (!principal) {
          return authFailure(c, tool, "authentication_required", "Connect an AgentSam account to continue.");
        }

        const auth = authorizeTool(principal, tool);
        if (!auth.ok) {
          const missing = "missing" in auth && auth.missing ? [...auth.missing] : [...tool.scopes];
          return authFailure(c, tool, "insufficient_scope", "The connected account has not granted the required permission.", missing);
        }

        const requestId = c.req.header("x-request-id") || c.req.header("cf-ray") || undefined;
        let receipt;
        try {
          receipt = await beginToolReceipt(c.env, principal, tool, args || {}, requestId);
        } catch (error) {
          const envelope = errorEnvelope(tool, error);
          return textAndStructured(envelope as unknown as Record<string, unknown>, true);
        }

        try {
          const payload = await dispatchPublicTool(tool.id, (args || {}) as Record<string, unknown>, c.env, principal);
          await finishToolReceipt(c.env, receipt, "succeeded").catch(() => undefined);

          if (tool.profile) {
            return textAndStructured(payload as Record<string, unknown>);
          }

          return textAndStructured(successEnvelope(tool, payload) as unknown as Record<string, unknown>);
        } catch (error) {
          const envelope = errorEnvelope(tool, error);
          await finishToolReceipt(c.env, receipt, "failed", envelope.error?.code).catch(() => undefined);
          return textAndStructured(envelope as unknown as Record<string, unknown>, true);
        }
      }
    );
  }

  return server;
}

export async function handleMcp(c: Context<{ Bindings: Env }>, surface: PublicToolSurface = "all") {
  if (!["GET", "POST", "DELETE"].includes(c.req.method)) {
    return c.json({ ok: false, error: "method_not_allowed" }, 405, { Allow: "GET, POST, DELETE" });
  }

  const server = createServer(c, surface);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
}
