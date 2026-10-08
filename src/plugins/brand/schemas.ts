import { z } from "zod";

const JsonObject = z.record(z.string(), z.unknown());

export const BRAND_TOOL_INPUT_SCHEMAS = {
  "brand.get_context": z.object({}),
  "brand.inspect": z.object({ scan: JsonObject }),
  "brand.assets.list": z.object({ scan: JsonObject }),
  "brand.asset.inspect": z.object({
    scan: JsonObject,
    assetId: z.string().min(1)
  }),
  "brand.usage.find": z.object({
    scan: JsonObject,
    query: z.string().min(1)
  }),
  "brand.contract.save": z.object({
    contract: JsonObject.refine(value => Object.keys(value).length>0 && JSON.stringify(value).length<=65536, "Contract must be nonempty and at most 64 KB"),
    evidence: z.array(z.unknown()).max(200).default([]),
    approved: z.literal(true),
    schemaVersion: z.string().min(1).max(36).default("1")
  }),
  "brand.contract.draft": z.object({
    scan: JsonObject,
    brandId: z.string().min(1).optional()
  }),
  "brand.consistency.evaluate": z.object({
    contract: JsonObject,
    candidate: JsonObject
  }),
  "brand.plan": z.object({
    scan: JsonObject,
    contract: JsonObject.optional(),
    brandId: z.string().min(1).optional()
  })
} as const;

export function getBrandInputSchema(toolId: string) {
  return BRAND_TOOL_INPUT_SCHEMAS[
    toolId as keyof typeof BRAND_TOOL_INPUT_SCHEMAS
  ];
}
