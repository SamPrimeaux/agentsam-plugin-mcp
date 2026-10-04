# AgentSam Plugin MCP

Public, least-privilege MCP capability plane for installable AgentSam plugins.

`agentsam-plugin-mcp` exposes user-recognizable AgentSam product capabilities to ChatGPT, AgentSam Local Studio, and compatible MCP hosts without exposing the private InnerAnimalMedia operator control plane.

## Why this repo exists

AgentSam domain packages are reusable deterministic capabilities.

This repo turns selected package capabilities into a public, authenticated, allowlisted MCP surface.

```text
ChatGPT / Local Studio / compatible MCP host
                    Â¦
                    å®—
             agentsam-plugin-mcp
                    âˆ‚
          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€£ŠR@(€€€€€€€€€ƒŠZð€€€€€€€€€€€€€€€€€€ƒŠZð(€€•¹ÑM…´	É…¹€€€€€•¹ÑM…´…µÁ…¥¸(€€€€€€€€€ƒŠ"€€€€€€€€€€€€€€€€€€ƒŠ
          å®—                   â–¼
@inneranimalmedia/   @inneranimalmedia/
 agentsam-brand      agentsam-campaign
```

The package is the reusable domain engine. The plugin/MCP layer is the installable user-facing capability surface.

## Trust boundary

`agentsam-plugin-mcp` is intentionally separate from `inneranimalmedia-mcp-server`.

- `inneranimalmedia-mcp-server` is the private InnerAnimalMedia operator/company control plane.
-‡`agentsam-plugin-mcp`  is the public plugin capability plane.
- The two may share published AgentSam packages and protocols.
- They do not share implicit authority, credentials, unrestricted database access, arbitrary terminal access, or an automatically inherited tool catalog.
- Every public MCP tool is explicitly allowlisted.

Shared code is acceptable. Shared authority is not.

## Current public plugins

### AgentSam Brand

AgentSam Brand answers:

> Who are we, and how should that identity be expressed?

Current public tools:

```text
brand.get_context
brand.inspect
brand.assets.list
brand.asset.inspect
brand.usage.find
brand.contract.draft
brand.consistency.evaluate
brand.plan
```

The public Worker consumes authorized evidence and the Worker-safe `@inneranimalmedia/agentsam-brand/public` package surface.

Filesystem/repository scanning remains a local or connected-resource capability; the public Worker does not gain arbitrary filesystem authority.

### AgentSam Campaign

AgentSam Campaign answers:

> What should we do now to achieve a measurable objective?

Current public tools:

```text
campaign.get_context
campaign.brief.draft
campaign.concept.evaluate
campaign.concepts.rank
campaign.plan
campaign.brief.save
campaign.concept.save
```

Campaign can consume BrandContract, products, inventory, audience, margin, performance, SEO/search, and other authorized evidence.

Campaign does not own canonical Brand state, product manufacturing, catalog authority, content production, or arbitrary external-system mutation.

## Product composition

Brand and Campaign are sibling products.

```text
AgentSam Brand
      Â‚
      Â‚ BrandContract
      â–¼
AgentSam Campaign
      Â‚
      Â‚ objective + evidence
      â–¼
campaign strategy / evaluation / plan
```

Campaign may vary expression inside approved Brand territory, but it must not silently rewrite canonical Brand state.

If campaign work reveals a durable new brand expression, Campaign can propose a Brand extension.

## Current execution boundary

The current public Campaign surface emphasizes:

```text
read
understand
draft
evaluate
rank
plan
save
```

External publishing, deployment, launch execution, and unrestricted mutations are intentionally not exposed yet.

Future write actions must have narrow scopes, explicit authorization, approval where required, idempotency, receipts, and post-write verification where possible.

## MCP transport

The public MCP endpoint uses the Web-standard Streamable HTTP transport from the Model Context Protocol SDK.

Routes:

```text
GET     /health
GET     /.well-known/oauth-protected-resource
GET     /mcp
POST    /mcp
DELETE  /mcp
```

The current transport is stateless and registers only the explicit `PUBLIC_TOOL_CATALOG`.

## Data

The Worker uses the canonical D1 binding:

```text
DB
```

Current public runtime tables include:

```text
public_users
public_identities
public_workspaces
public_connections
public_plugin_installations
public_brand_contracts
public_campaign_briefs
public_campaign_concepts
public_campaign_outcomes
public_tool_receipts
```

Commerce systems remain authoritative for live product, inventory, order, and pricing facts.

Analytics systems remain authoritative for observed performance facts.

Plugins consume or project those facts without pretending to own them.

## Packages

Published domain packages:

```text
@inneranimalmedia/agentsam-brand
@inneranimalmedia/agentsam-campaign
```

These packages remain portable independently of this MCP host.

## Development

Requirements:

- Node.js 22+
- npm
- Wrangler
- Cloudflare account for D1/Worker operations

Install and verify:

```sh
npm install
npm run typecheck
npm test
```

Run locally:

```sh
npm run dev
```

Then connect an MCP client to:

``text
http://localhost:8787/mcp
```

## Database migrations

Local:

```sh
npx wrangler d1 migrations apply DB --local
```

Remote:

```sh
npx wrangler d1 migrations apply DB --remote
```

Inspect tables:

``sh
npx wrangler d1 execute DB --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

## Architecture and product documentation

Durable architecture decisions live in:

```text
docs/adr/
```

Product requirements live in:

```text
docs/prd/
```

Current records:

```text
docs/adr/ADR-0001-public-mcp-boundary.md
docs/adr/ADR-0002-brand-campaign-plugin-boundaries.md
docs/prd/PRD-agentsam-campaign.md
```

See the README inside each directory for the documentation convention.

## Documentation rule

Use an **ADR** when deciding:

- product/domain ownership;
- authority or trust boundaries;
- portability requirements;
- storage/data authority;
- protocol/runtime boundaries;
- decisions that future implementations should not casually reverse.

Use a **PRD** when defining:

- the user problem;
- product promise;
- required workflows;
- capabilities;
- lifecycle;
- acceptance criteria;
- definition of v1;
- future product behavior.

In short:

```text
ADR = why the system is shaped this way
PRD = what the product must accomplish
```

## Security principles

- explicit public tool allowlist;
- least privilege;
- narrow scopes;
- no arbitrary terminal exposure;
- no raw D1 query tool;
- no inherited GitHub write authority;
- no automatic bridge to the internal operator MCP;
- missing evidence reduces confidence instead of creating fabricated facts;
- external writes require explicit authorization.

## Status

The public MCP transport, Brand surface, Campaign surface, local/remote D1 schema, published Brand/Campaign domain packages, and current test suite are operational.

The broader plugin lifecycle, OAuth completion, additional skills, optional MCP UI, execution/measurement actions, and public-directory packaging continue to evolve.
