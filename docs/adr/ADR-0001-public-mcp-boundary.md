# ADR-0001: Public AgentSam MCP boundary

## Decision

Create `agentsam-plugin-mcp` as its own repo/deployable Worker.

`inneranimalmedia-mcp-server` remains the private InnerAnimalMedia operator and company-data control plane.

One public Worker initially hosts multiple AgentSam plugin namespaces. Split later only for isolation, compliance, scaling, or release reasons.

## Identity and authorization

Keep three concerns separate:

1. Human identity: who is the AgentSam user?
2. MCP authorization: may this client invoke AgentSam Brand for this user?
3. Resource authorization: which sites, CMSs, stores, storage, etc. may Brand access?

OpenAI / Sign in with ChatGPT may become one identity provider. It is not the identity authority for the whole AgentSam architecture, and IAM is not a mandatory public dependency.
