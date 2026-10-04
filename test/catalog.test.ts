import { describe, expect, it } from "vitest";
import { PUBLIC_TOOL_CATALOG } from "../src/mcp/catalog";

describe("public MCP catalog", () => {
  it("contains only explicitly public Brand tools initially", () => {
    expect(PUBLIC_TOOL_CATALOG.length).toBeGreaterThan(0);
    expect(PUBLIC_TOOL_CATALOG.every((tool) => tool.plugin === "agentsam-brand")).toBe(true);
  });

  it("starts read-only", () => {
    expect(PUBLIC_TOOL_CATALOG.every((tool) => tool.readOnlyHint)).toBe(true);
    expect(PUBLIC_TOOL_CATALOG.every((tool) => !tool.destructiveHint)).toBe(true);
  });

  it("does not expose obvious internal operator surfaces", () => {
    const ids = PUBLIC_TOOL_CATALOG.map((tool) => tool.id);
    expect(ids.some((id) => id.includes("terminal"))).toBe(false);
    expect(ids.some((id) => id.includes("d1_query"))).toBe(false);
    expect(ids.some((id) => id.includes("github_write"))).toBe(false);
  });
});
