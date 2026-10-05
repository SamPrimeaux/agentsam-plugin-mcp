# AgentSam Brand — V1 use-case inventory

## Product boundary
AgentSam Brand understands, defines, reviews, organizes, and protects brand identity from evidence. It does not plan campaigns, mutate arbitrary infrastructure, or silently change canonical BrandContract state.

## Direct requests
| ID | User goal | Primary workflow | Tools |
|---|---|---|---|
| BR-D01 | Understand our current brand | brand-audit | brand.get_context → brand.inspect |
| BR-D02 | Draft a BrandContract | brand-definition | brand.get_context → brand.inspect → brand.contract.draft |
| BR-D03 | Audit brand assets | brand-asset-review | brand.get_context → brand.assets.list → brand.asset.inspect |
| BR-D04 | Check candidate consistency | brand-consistency-review | brand.get_context → brand.consistency.evaluate |
| BR-D05 | Find inconsistent usage | brand-audit | brand.get_context → brand.usage.find |
| BR-D06 | Plan cleanup | brand-planning | brand.get_context → brand.inspect → brand.plan |

## Indirect requests
- “Does this landing page actually feel like us?” → consistency review.
- “Why does our site feel like three different brands?” → audit + usage.
- “Which logo should the team be using?” → asset review grounded in canonical evidence.
- “I keep explaining our voice to every writer.” → definition / durable BrandContract.
- “What would you fix first?” → planning after evidence collection.

## Follow-ups
- “Show me the evidence for that finding.”
- “Which assets caused the warning?”
- “What changed if we accept this proposal?”
- “Keep the current contract; just suggest changes.”
- “What evidence is still missing?”

## Sparse-data cases
When no BrandContract or weak evidence exists, return available observations, identify missing evidence, lower confidence, and propose acquisition steps. Never synthesize a canonical rule from absence.

## Rich-data cases
With BrandContract + assets + usage evidence, compare observed values against canonical rules, cite exact evidence/provenance, rank issues by severity/confidence, and distinguish proposed remediation from executed changes.

## Negative / out-of-scope
- Launch or optimize an ad campaign → Campaign.
- Edit arbitrary repository/server files → unsupported.
- Manufacture products or mutate a catalog → Commerce/Merch.
- Generate unrelated generic content → Content.
- Secretly alter BrandContract based on one candidate → forbidden.
- Expose raw provider credentials or infrastructure APIs → forbidden.

## Authorization cases
Read workflows require Brand read scopes. Contract persistence or later apply operations require explicit Brand write scopes. Missing scopes must produce a recoverable authorization error; never downgrade to a hidden broader credential.

## Failure cases
Provider unavailable, malformed evidence, unknown asset id, missing contract, stale source, unauthorized workspace, malformed bearer token, and internal dependency failure must return bounded errors with recovery guidance and no sensitive payloads.

## Exit gate
Every public Brand tool maps to at least one row above; every V1 goal has a tool path; direct and indirect prompts select the same bounded workflow.
