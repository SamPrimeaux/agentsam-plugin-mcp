# AgentSam Plugin Productization Reference

Brand and Campaign are the calibration products for the AgentSam plugin productization spine.

The canonical platform contract lives in `SamPrimeaux/agentsam-sdk` under:

- `protocol/plugins/agentsam.plugin-product.v1.schema.json`
- `protocol/plugins/agentsam.plugin-evidence-bundle.v1.schema.json`
- `protocol/plugins/agentsam.plugin-quality-evidence.v1.schema.json`
- `protocol/plugins/agentsam.plugin-quality-receipt.v1.schema.json`
- `docs/architecture/PLUGIN-PRODUCTIZATION-SPINE.md`

This repository owns the public plugin packages and MCP surface. It does **not** own a second OAuth engine, credential vault, installer, Settings framework, repository scanner, Machine scanner, generic health engine, or receipt engine.

## Reference products

```text
plugins/agentsam-brand/
  plugin.json
  mcp.json
  agentsam.product.json
  agentsam.quality.json

plugins/agentsam-campaign/
  plugin.json
  mcp.json
  agentsam.product.json
  agentsam.quality.json
```

`agentsam.product.json` is definition only. It must never persist `connected`, `ready`, live tool counts, health state, account installation state, or other runtime observations.

`agentsam.quality.json` is evidence, not a declaration of readiness. Runtime checks that have not actually been exercised remain `unverified`.

## Governing pipeline

```text
Machine inspect/crawl evidence
        ↓
Repository graph
        ↓
repository.mine reuse/authority proposals
        ↓
agentsam plugin inspect
        ↓
agentsam plugin verify
        ↓
computed quality receipt
```

The plugin inspector consumes those receipts; it must not independently walk repositories or rediscover authority.

Brand and Campaign must graduate through the exact same generic pipeline. No `if brand` or `if campaign` special cases are acceptable.

## Current graduation gate

Both products intentionally remain **NOT_READY** until the verification evidence proves the required runtime gates, including:

- catalog and account installation
- real OAuth authorization and requested permissions
- MCP reachability
- capability discovery
- all declared tools executable
- health probe
- real product smoke
- result schema + renderability
- saved-result round trip
- least privilege and tenant isolation
- fresh-account and fresh-install portability

Static source presence is never substituted for those runtime checks.

Do not add a third official plugin until Brand and Campaign can both produce a computed READY receipt from current evidence.
