import { describe, expect, it } from "vitest";
import { CAMPAIGN_PUBLIC_TOOLS } from "../src/plugins/campaign/tools";
import { CAMPAIGN_TOOL_INPUT_SCHEMAS } from "../src/plugins/campaign/schemas";
import { PUBLIC_TOOL_CATALOG } from "../src/mcp/catalog";

describe("AgentSam Campaign Studio public surface", () => {
  it("registers every Campaign tool in the explicit public catalog", () => {
    const ids = new Set(PUBLIC_TOOL_CATALOG.map((tool) => tool.id));
    for (const tool of CAMPAIGN_PUBLIC_TOOLS) {
      expect(ids.has(tool.id)).toBe(true);
    }
  });

  it("has an input schema for every Campaign tool", () => {
    expect(Object.keys(CAMPAIGN_TOOL_INPUT_SCHEMAS).sort()).toEqual(
      CAMPAIGN_PUBLIC_TOOLS.map((tool) => tool.id).sort()
    );
  });

  it("does not expose autonomous publishing", () => {
    expect(
      CAMPAIGN_PUBLIC_TOOLS.some((tool) =>
        /publish|deploy|launch\.execute/i.test(tool.id)
      )
    ).toBe(false);
  });
});
