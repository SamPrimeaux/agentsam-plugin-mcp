# AgentSam Plugin MCP

Public, least-privilege MCP capability plane for installable AgentSam plugins.

## Boundary

- `inneranimalmedia-mcp-server` stays the private company/operator control plane.
- `agentsam-plugin-mcp` is the public plugin capability plane.
- They may share published AgentSam domain packages and protocols.
- They must not share implicit authority, credentials, unrestricted DB access, or an automatic tool catalog.

## Initial modules

- Brand: first real public AgentSam plugin capability family.
- Campaign: reserved, not exposed yet.

## Routes

- `GET /health`
- `GET /.well-known/oauth-protected-resource`
- `POST /mcp`

## Start

```sh
npm install
npm run typecheck
npm test
npm run dev
```

Then inspect with the official MCP Inspector using `http://localhost:8787/mcp`.
