import { describe, expect, it } from "vitest";
import {
  BRAND_TOOL_INPUT_SCHEMAS,
  getBrandInputSchema
} from "../src/plugins/brand/schemas";

describe("Brand public MCP schemas", () => {
  it("covers all eight Brand tools", () => {
    expect(Object.keys(BRAND_TOOL_INPUT_SCHEMAS)).toHaveLength(8);
  });

  it("requires deterministic scan evidence for inspection", () => {
    const schema = getBrandInputSchema("brand.inspect")!;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({
      scan: { capability: "brand.scan" }
    }).success).toBe(true);
  });
});
