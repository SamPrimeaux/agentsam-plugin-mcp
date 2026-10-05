import { describe, expect, it } from "vitest";
import app from "../src/index";
import {
  BRAND_TOOL_CATALOG,
  CAMPAIGN_TOOL_CATALOG,
  PUBLIC_TOOL_CATALOG
} from "../src/mcp/catalog";

const env = {
  DB: {} as D1Database,
  SERVICE_NAME: "agentsam-plugin-mcp",
  SERVICE_ENV: "test"
};

async function rpc(path: string, method: string, params?: unknown, id = 1) {
  return app.request(
    path,
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

async function listed(path: string) {
  const response = await rpc(path, "tools/list");
  expect(response.status).toBe(200);
  const body = await response.json() as any;
  return body.result?.tools ?? [];
}

describe("public MCP transport", () => {
  it("initializes through Streamable HTTP", async () => {
    const response = await rpc("/mcp", "initialize", {
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

  it("lists only the explicit combined public catalog with schemas and auth metadata", async () => {
    const tools = await listed("/mcp");
    const names = tools.map((tool: any) => tool.name).sort();
    const expected = PUBLIC_TOOL_CATALOG.map((tool) => tool.id).sort();

    expect(names).toEqual(expected);
    expect(names.some((name: string) => /terminal|shell|d1_query|sql|github_write|vault|secret_get/i.test(name))).toBe(false);

    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.outputSchema).toBeDefined();
      expect(tool.annotations).toBeDefined();
      expect(tool._meta?.securitySchemes?.[0]?.type).toBe("oauth2");
    }

    const profile = tools.find((tool: any) => tool.name === "agentsam.profile");
    expect(profile?._meta?.["openai/profile"]).toBe(true);
  });

  it("isolates Brand and Campaign install surfaces", async () => {
    const brand = await listed("/mcp/brand");
    const campaign = await listed("/mcp/campaign");

    expect(brand.map((tool: any) => tool.name).sort())
      .toEqual(BRAND_TOOL_CATALOG.map((tool) => tool.id).sort());
    expect(campaign.map((tool: any) => tool.name).sort())
      .toEqual(CAMPAIGN_TOOL_CATALOG.map((tool) => tool.id).sort());

    expect(brand.some((tool: any) => tool.name.startsWith("campaign."))).toBe(false);
    expect(campaign.some((tool: any) => tool.name.startsWith("brand."))).toBe(false);
  });

  it("advertises and serves only the UI resource owned by each product surface", async () => {
    const brandTools = await listed("/mcp/brand");
    const campaignTools = await listed("/mcp/campaign");

    const brandContext = brandTools.find((tool: any) => tool.name === "brand.get_context");
    const campaignRank = campaignTools.find((tool: any) => tool.name === "campaign.concepts.rank");

    expect(brandContext?._meta?.ui?.resourceUri).toBe("ui://agentsam-brand/snapshot-v1.html");
    expect(campaignRank?._meta?.ui?.resourceUri).toBe("ui://agentsam-campaign/concept-compare-v1.html");

    const brandResourcesResponse = await rpc("/mcp/brand", "resources/list");
    const brandResourcesBody = await brandResourcesResponse.json() as any;
    const brandUris = (brandResourcesBody.result?.resources ?? []).map((row: any) => row.uri);
    expect(brandUris).toContain("ui://agentsam-brand/snapshot-v1.html");
    expect(brandUris).not.toContain("ui://agentsam-campaign/concept-compare-v1.html");

    const campaignResourcesResponse = await rpc("/mcp/campaign", "resources/list");
    const campaignResourcesBody = await campaignResourcesResponse.json() as any;
    const campaignUris = (campaignResourcesBody.result?.resources ?? []).map((row: any) => row.uri);
    expect(campaignUris).toContain("ui://agentsam-campaign/concept-compare-v1.html");
    expect(campaignUris).not.toContain("ui://agentsam-brand/snapshot-v1.html");

    const readResponse = await rpc("/mcp/brand", "resources/read", {
      uri: "ui://agentsam-brand/snapshot-v1.html"
    });
    const readBody = await readResponse.json() as any;
    expect(readBody.result?.contents?.[0]?.mimeType).toBe("text/html;profile=mcp-app");
    expect(readBody.result?.contents?.[0]?.text).toContain("Brand Snapshot");
  });

  it("fails protected execution closed with a standard OAuth challenge when disconnected", async () => {
    const response = await rpc("/mcp/brand", "tools/call", {
      name: "brand.get_context",
      arguments: {}
    });

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.result?.isError).toBe(true);
    expect(body.result?.structuredContent?.error?.code).toBe("authentication_required");
    expect(body.result?._meta?.["mcp/www_authenticate"]?.[0]).toContain("resource_metadata=");
  });
});
