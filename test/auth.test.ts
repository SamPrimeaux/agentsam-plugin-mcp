import { describe, expect, it } from "vitest";
import { authorizeTool } from "../src/auth/authorize";
import type { PublicPrincipal, PublicToolDefinition } from "../src/types";

const tool: PublicToolDefinition = {
  id: "brand.inspect",
  plugin: "agentsam-brand",
  title: "Inspect brand",
  description: "test",
  scopes: ["brand:read"],
  risk: "read",
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false
};

describe("tool authorization", () => {
  it("rejects anonymous access", () => {
    expect(authorizeTool(null, tool).ok).toBe(false);
  });

  it("rejects missing scopes", () => {
    const principal: PublicPrincipal = {
      userId: "usr_demo",
      profileId: "prf_demo",
      issuer: "https://issuer.example",
      subject: "subject-demo",
      scopes: new Set()
    };
    expect(authorizeTool(principal, tool).ok).toBe(false);
  });

  it("accepts required scope", () => {
    const principal: PublicPrincipal = {
      userId: "usr_demo",
      profileId: "prf_demo",
      issuer: "https://issuer.example",
      subject: "subject-demo",
      scopes: new Set(["brand:read"])
    };
    expect(authorizeTool(principal, tool).ok).toBe(true);
  });
});
