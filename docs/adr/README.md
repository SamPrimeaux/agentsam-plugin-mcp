# Architecture Decision Records

Use ADRs for durable architecture, trust-boundary, authority, portability, and product-boundary decisions.

## Convention

- File names: `ADR-NNNN-short-decision-name.md`
- Status values: `Proposed`, `Accepted`, `Superseded`, `Deprecated`
- Prefer one coherent decision per ADR.
- Record context, the decision, consequences, invariants, and rejected alternatives.
- Do not rewrite accepted history to reflect a new decision. Add a new ADR and mark the old one superseded.
- Cross-repo decisions should use the same ADR number and title where practical.

## Current ADRs

- `ADR-0001-public-mcp-boundary.md` — public MCP vs internal operator authority (MCP repo; legacy top-level location)
- `ADR-0002-brand-campaign-plugin-boundaries.md` — Brand/Campaign ownership, composition, data authority, and public MCP boundary

ADRs describe **why the system is shaped this way**. Product behavior and acceptance criteria belong in PRDs.
