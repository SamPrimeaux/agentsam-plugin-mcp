# ADR-0003: Private plugin sources, public capability distribution

- **Status:** Accepted
- **Date:** 2026-11-27
- **Decision owner:** Inner Animal Media

## Context

ChatGPT personal plugins are private source packages. They may contain user-authored skills, companion identities, source references, design tokens, artwork, and provider-specific configuration. Some are instruction-and-asset packages rather than executable MCP products.

This repository is the public AgentSam capability plane. Its public package catalog is generated from the explicit `plugins/` directory and requires a real MCP endpoint, registered route, executable tool definitions, and product/quality evidence. Copying personal plugin packages into that directory would either fail the product gates or accidentally publish private material.

## Decision

Keep the two planes separate:

1. **Private source plane:** preserve original personal plugin packages, skills, references, companion identities, artwork, and source metadata in the private InnerAnimalMedia repository.
2. **Public capability plane:** expose only deliberately productized capabilities through this repository's explicit package manifests, MCP routes, schemas, handlers, permissions, and tests.

The private source packages are not copied into this public repository. A private plugin is not made public merely because its source exists in the private repository or because a registry row exists.

## Runtime and data rules

- `agentsam_plugins` is registry metadata, not an automatic publication switch.
- `agentsam_tools` describes executable tools; public dispatch remains explicitly allowlisted in `src/mcp/catalog.ts` and `src/mcp/dispatch.ts`.
- `agentsam_plugin_installations` represents account-owned installations and must not be inferred from a catalog entry.
- OAuth state and grants are account/client/resource-bound. Store credentials only as ciphertext or secret references; never place raw tokens in plugin configuration or source manifests.
- `agentsam_plugin_skills` associates canonical skill records with plugin packages without duplicating skill bodies.
- The existing `public_*` tables and public Brand/Campaign product boundaries remain intact.

## Promotion gate

A private plugin may be promoted to this public capability plane only after:

- its owner approves the exact capabilities to expose;
- each public tool has a stable schema, handler, scope, and risk classification;
- tenant isolation and least privilege are verified;
- OAuth and installation behavior are real and tested where required;
- positive and negative smoke tests pass;
- outputs have a documented artifact/result contract;
- fresh-account and fresh-install portability are verified;
- private source files, credentials, companion references, and unrelated skills are excluded.

## Consequences

This repository remains intentionally smaller than the user's personal plugin inventory. Private source richness is preserved elsewhere; only reviewed, reusable, least-privilege capabilities graduate here. The public catalog generator must never discover private source directories or dynamically expose every registry row.
