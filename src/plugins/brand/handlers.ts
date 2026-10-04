import {
  inspectBrandEvidence,
  listBrandAssetEvidence,
  inspectBrandAssetEvidence,
  findBrandUsageEvidence,
  draftBrandContractFromEvidence,
  buildBrandPlanFromEvidence,
  evaluateBrandConsistency
} from "@inneranimalmedia/agentsam-brand/public";
import type { Env, PublicPrincipal } from "../../types";
import { getBrandContext } from "./repository";

type JsonArgs = Record<string, unknown>;

export async function dispatchBrandTool(
  toolId: string,
  args: JsonArgs,
  env: Env,
  principal: PublicPrincipal
): Promise<unknown> {
  switch (toolId) {
    case "brand.get_context":
      return getBrandContext(env, principal);
    case "brand.inspect":
      return inspectBrandEvidence(args.scan as any);
    case "brand.assets.list":
      return { assets: listBrandAssetEvidence(args.scan as any) };
    case "brand.asset.inspect":
      return inspectBrandAssetEvidence(args.scan as any, String(args.assetId || ""));
    case "brand.usage.find":
      return findBrandUsageEvidence(args.scan as any, String(args.query || ""));
    case "brand.contract.draft":
      return draftBrandContractFromEvidence(args.scan as any, {
        brandId: args.brandId ? String(args.brandId) : undefined
      });
    case "brand.consistency.evaluate":
      return evaluateBrandConsistency(args.contract as any, args.candidate as any);
    case "brand.plan":
      return buildBrandPlanFromEvidence(args.scan as any, {
        contract: args.contract as any,
        brandId: args.brandId ? String(args.brandId) : undefined
      });
    default:
      throw new Error("unknown_brand_tool");
  }
}
