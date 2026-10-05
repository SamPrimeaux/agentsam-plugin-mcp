# AgentSam Campaign — V1 use-case inventory

## Product boundary
AgentSam Campaign plans, compares, and improves campaigns using real brand, product, audience, economics, inventory, search, channel, and historical evidence. It coordinates requirements; it does not silently perform catalog, manufacturing, media-production, or campaign-execution mutations.

## Direct requests
| ID | User goal | Primary workflow | Tools |
|---|---|---|---|
| CA-D01 | Decide what to promote | campaign-strategy | campaign.get_context → concept evaluation/ranking |
| CA-D02 | Draft a campaign brief | campaign-brief | campaign.get_context → campaign.brief.draft → campaign.brief.save |
| CA-D03 | Compare concepts | campaign-concept-review | campaign.get_context → campaign.concepts.rank |
| CA-D04 | Evaluate a discount/offer | offer-review | campaign.get_context → campaign.concept.evaluate |
| CA-D05 | Plan a launch | campaign-strategy | campaign.get_context → campaign.brief.draft → campaign.plan |
| CA-D06 | Plan SEO/search work | seo-campaign | campaign.get_context → campaign.plan |
| CA-D07 | Save an approved concept | campaign-concept-development | campaign.concept.save |

## Indirect requests
- “Sales usually slow down around this time. What should we do?” → strategy grounded in seasonality/history.
- “Would 20% off actually help?” → offer review with margin/inventory/performance evidence.
- “We have too much of this product—what’s the smart move?” → inventory-aware strategy.
- “Which of these three ideas has the best case?” → concept ranking with explainable factors.
- “Search traffic is there but conversion is weak.” → search/channel plan with evidence gaps surfaced.

## Follow-ups
- “Why did A beat B?”
- “What evidence are you missing?”
- “What changes if inventory is low?”
- “Save this as the approved brief.”
- “What did we learn from the last campaign?”

## Sparse-data cases
Brand + product + objective should still yield a basic plan, with explicit missing evidence and reduced confidence. Never invent audience, margin, inventory, search, or performance values.

## Rich-data cases
Add pricing/COGS/inventory for commercial reasoning; add analytics/customer/history/search for evidence-backed strategy. Rankings must expose dimensions, weights, confidence, evidence, missing evidence, and reasons.

## Negative / out-of-scope
- Guarantee doubled sales → refuse the guarantee and present uncertainty.
- Mutate catalog/variants without commerce authority → unsupported.
- Launch with planning-only permissions → no execution.
- Rewrite canonical BrandContract → Brand owns it.
- Create arbitrary media assets → Content/Brand/media capability.
- Expose provider APIs or raw SQL → forbidden.

## Authorization cases
Context reads require campaign:read. Saving briefs requires campaign:brief:write; saving concepts requires campaign:concept:write. Future execute/measure scopes are not implied by planning scopes.

## Failure cases
No workspace, provider unavailable, stale evidence, malformed concept, no measurable objective, bad input, missing write scope, wrong issuer/audience, cross-workspace spoof, or D1 failure must return a stable error envelope.

## Exit gate
The indirect seasonal-slowdown prompt completes coherently; reviewers can trace why one concept outranked another; later context can cite stored outcomes/learnings without fabricating them.
