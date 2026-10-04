import { describe, expect, it } from "vitest";
import { PUBLIC_TOOL_CATALOG } from "../src/mcp/catalog";

describe("public MCP catalog", () => {
  it("contains only explicitly owned AgentSam public plugin surfaces", () => {
    expect(PUBLIC_TOOL_CATALOG.length).toBeGreaterThan(0);
    const plugins = new Set(PUBLIC_TOOL_CATALOG.map((tool) => tool.plugin));
    expect([...plugins].sort()).toEqual([
      "agentsam-brand",
      "agentsam-campaign",
      "agentsam-shared"
    ]);
  });

  it("allows only bounded non-destructive writes", () => {
    expect(PUBLIC_TOOL_CATALOG.every((tool) => !tool.destructiveHint)).toBe(true);
    expect(PUBLIC_TOOL_CATALOG.every((tool) => tool.risk !== "publish")).toBe(true);

    const writable = PUBLIC_TOOL_CATALOG
      .filter((tool) => !tool.readOnlyHint)
      .map((tool) => tool.id)
      .sort();

    expect(writable).toEqual([
      "campaign.brief.save",
      "campaign.concept.save"
    ]);
  });

  it("does not expose obvious internal operator surfaces", () => {
    const ids = PUBLIC_TOOL_CATALOG.map((tool) => tool.id).join("\n");
    expect(ids).not.toMatch(/terminal/i);
    expect(ids).not.toMatch(/d1_query/i);
    expect(ids).not.toMatch(/github_write/i);
    expect(ids).not.toMatch(/publish/i);
    expect(ids).not.toMatch(/deploy/i);
  });
});
