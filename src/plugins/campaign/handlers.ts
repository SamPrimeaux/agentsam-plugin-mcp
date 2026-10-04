import {
  buildCampaignBrief,
  evaluateCampaignConcept,
  rankCampaignConcepts,
  buildCampaignPlan
} from "@inneranimalmedia/agentsam-campaign";
import type { Env, PublicPrincipal } from "../../types";

type JsonArgs = Record<string, unknown>;

function requireWorkspace(principal: PublicPrincipal) {
  if (!principal.workspaceId) throw new Error("workspace_required");
  return principal.workspaceId;
}

function parseJson(value: unknown) {
  if (typeof value !== "string") return null;
  try { return JSON.parse(value); } catch { return null; }
}

async function getContext(env: Env, principal: PublicPrincipal) {
  const workspaceId = requireWorkspace(principal);

  const brand = await env.DB.prepare(
    `SELECT id, contract_json, evidence_json, updated_at
       FROM public_brand_contracts
      WHERE workspace_id = ?1
      ORDER BY updated_at DESC
      LIMIT 1`
  ).bind(workspaceId).first();

  const briefs = await env.DB.prepare(
    `SELECT id, status, brief_json, created_at, updated_at
       FROM public_campaign_briefs
      WHERE workspace_id = ?1
      ORDER BY updated_at DESC LIMIT 20`
  ).bind(workspaceId).all();

  const concepts = await env.DB.prepare(
    `SELECT id, brief_id, status, concept_json, evaluation_json,
            created_at, updated_at
       FROM public_campaign_concepts
      WHERE workspace_id = ?1
      ORDER BY updated_at DESC LIMIT 50`
  ).bind(workspaceId).all();

  return {
    workspaceId,
    brandContract: brand ? parseJson(brand.contract_json) : null,
    brandEvidence: brand ? parseJson(brand.evidence_json) : null,
    briefs: (briefs.results ?? []).map((row: any) => ({
      ...row,
      brief: parseJson(row.brief_json)
    })),
    concepts: (concepts.results ?? []).map((row: any) => ({
      ...row,
      concept: parseJson(row.concept_json),
      evaluation: parseJson(row.evaluation_json)
    }))
  };
}

export async function dispatchCampaignTool(
  toolId: string,
  args: JsonArgs,
  env: Env,
  principal: PublicPrincipal
): Promise<unknown> {
  switch (toolId) {
    case "campaign.get_context":
      return getContext(env, principal);

    case "campaign.brief.draft":
      return buildCampaignBrief(args as any);

    case "campaign.concept.evaluate":
      return evaluateCampaignConcept(args.concept as any, args.context as any);

    case "campaign.concepts.rank":
      return rankCampaignConcepts(args.concepts as any[], args.context as any);

    case "campaign.plan":
      return buildCampaignPlan({
        brief: args.brief as any,
        concept: args.concept as any,
        context: args.context as any
      });

    case "campaign.brief.save": {
      const workspaceId = requireWorkspace(principal);
      const brief = args.brief as any;
      const briefId = String(brief?.id || `brief_${crypto.randomUUID()}`);

      await env.DB.prepare(
        `INSERT INTO public_campaign_briefs
           (id, workspace_id, status, brief_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, unixepoch(), unixepoch())
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           brief_json = excluded.brief_json,
           updated_at = unixepoch()`
      ).bind(
        briefId,
        workspaceId,
        String(brief?.status || "draft"),
        JSON.stringify({ ...brief, id: briefId })
      ).run();

      return { saved: true, id: briefId };
    }

    case "campaign.concept.save": {
      const workspaceId = requireWorkspace(principal);
      const concept = args.concept as any;
      const conceptId = String(concept?.id || `concept_${crypto.randomUUID()}`);

      await env.DB.prepare(
        `INSERT INTO public_campaign_concepts
           (id, workspace_id, brief_id, status, concept_json,
            evaluation_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, unixepoch(), unixepoch())
         ON CONFLICT(id) DO UPDATE SET
           brief_id = excluded.brief_id,
           status = excluded.status,
           concept_json = excluded.concept_json,
           evaluation_json = excluded.evaluation_json,
           updated_at = unixepoch()`
      ).bind(
        conceptId,
        workspaceId,
        args.briefId ? String(args.briefId) : null,
        String(concept?.status || "draft"),
        JSON.stringify({ ...concept, id: conceptId }),
        args.evaluation ? JSON.stringify(args.evaluation) : null
      ).run();

      return { saved: true, id: conceptId };
    }

    default:
      throw new Error("unknown_campaign_tool");
  }
}
