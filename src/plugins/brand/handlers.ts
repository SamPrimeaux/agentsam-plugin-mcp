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
    case "brand.contract.save": {
      if (args.approved !== true) throw new Error("brand_contract_approval_required");
      const workspaceId = principal.workspaceId;
      if (!workspaceId) throw new Error("workspace_required");
      const contract=args.contract;
      if (!contract || typeof contract !== "object" || Array.isArray(contract) ||
          Object.keys(contract).length === 0) throw new Error("brand_contract_invalid");
      // Store an immutable, explicitly approved revision in the existing
      // workspace-scoped contract registry. No automatic publish/apply actions.
      const id = "bct_" + crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO public_brand_contracts (id,workspace_id,schema_version,status,contract_json,evidence_json,created_at,updated_at) VALUES (?1,?2,?3,'approved',?4,?5,unixepoch(),unixepoch())"
      ).bind(id,workspaceId,String(args.schemaVersion||"1"),
        JSON.stringify(contract),JSON.stringify(args.evidence||[])).run();
      return {saved:true,id,workspaceId,status:"approved"};
    }
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
