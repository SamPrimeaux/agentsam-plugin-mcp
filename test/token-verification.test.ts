import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { PublicAuthError,scopesFromPayload,verifyPublicAccessToken } from "../src/auth/token";
import type { Env } from "../src/types";

const origin = "https://plugins.inneranimalmedia.com";
const secret = "test-standalone-agent-sam-oauth-signing-key-long-enough-123456789";
const request = new Request(origin+"/mcp");
function envFor(status="active"): Env {
  return {
    DB: {prepare:()=>({bind:()=>({first:async()=>status==="missing"?null:{id:"au_test",status}})})} as any,
    SERVICE_NAME:"agentsam-plugin-mcp",SERVICE_ENV:"test",OAUTH_SIGNING_SECRET:secret
  };
}
async function token(audience=origin+"/mcp") {
  return new SignJWT({scope:"profile:read brand:read",scp:["profile:read","brand:read"]})
    .setProtectedHeader({alg:"HS256"})
    .setIssuer(origin).setAudience(audience).setSubject("au_test")
    .setIssuedAt().setExpirationTime("15m")
    .sign(new TextEncoder().encode(secret));
}
describe("independent public OAuth verification",()=>{
  it("accepts its own audience-bound token and scopes",async()=>{
    const payload=await verifyPublicAccessToken(envFor(),await token(),request);
    expect(payload.sub).toBe("au_test");
    expect([...scopesFromPayload(payload)]).toEqual(["profile:read","brand:read"]);
  });
  it("rejects a token minted for a different MCP resource",async()=>{
    await expect(verifyPublicAccessToken(envFor(),await token(origin+"/other"),request))
      .rejects.toMatchObject({code:"invalid_token"} satisfies Partial<PublicAuthError>);
  });
  it("rejects suspended users",async()=>{
    await expect(verifyPublicAccessToken(envFor("suspended"),await token(),request))
      .rejects.toMatchObject({code:"invalid_token"});
  });
  it("fails closed without signing authority",async()=>{
    await expect(verifyPublicAccessToken({...envFor(),OAUTH_SIGNING_SECRET:undefined},await token(),request))
      .rejects.toMatchObject({code:"invalid_token"});
  });
});
