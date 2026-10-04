import { describe, expect, it } from "vitest";
import app from "../src/index";
import { PUBLIC_TOOL_CATALOG } from "../src/mcp/catalog";

const env = {
  DB: {} as D1Database,
  SERVICE_NAME: "agentsam-plugin-mcp",
  SERVICE_ENV: "test"
};

async function rpc(method: string, params?: unknown, id = 1) {
  return app.request(
    "/mcp",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        ...(params === undefined ? {} : { params })
      })
    },
    env
  );
}

describe("public MCP transport", () => {
  it("initializes through Streamable HTTP", async () => {
    const response = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "agentsam-plugin-mcp-test", version: "1.0.0" }
    });

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.jsonrpc).toBe("2.0");
    expect(body.result?.serverInfo?.name).toBe("agentsam-plugin-mcp");
    expect(body.result?.capabilities?.tools).toBeDefined();
  });

  it("lists only the explicit public tool catalog", async () => {
    const response = await rpc("tools/list");
    expect(response.status).toBe(200);

    const body = await response.json() as any;
    const names = (body.result?.tools ?? []).map((tool: any) => tool.name).sort();
    const expected = PUBLIC_TOOL_CATALOG.map((tool) => tool.id).sort();

    expect(names).toEqual(expected);
    expect(names.some((name: string) => /terminal|d1_query|github_write/i.test(name))).toBe(false);
  });

  it("fails protected tool execution closed while public auth is unwired", async () => {
    const response = await rpc("tools/call", {
      name: "brand.get_context",
      arguments: {}
    });

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.result?.isError).toBe(true);
    expect(body.result?.content?.[0]?.text).toContain("authentication_required");
  });
});
