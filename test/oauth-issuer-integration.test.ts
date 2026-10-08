import { describe, expect, it } from "vitest";
import app from "../src/index";
import type { Env } from "../src/types";
import { createHash, randomBytes } from "node:crypto";

const origin="https://plugins.inneranimalmedia.com";
const secret="test-only-independent-oauth-secret-signing-material-1234567890123";
const read=(response:Response)=>response.json() as Promise<any>;
type Rec=Record<string,any>;
class MemoryD1 {
  tokens:Rec[]=[];
  accounts:Rec[]=[];
  prepare(sql:string) {
    return {bind:(...args:any[])=>({
      first:async()=> {
        if(sql.includes("FROM user_oauth_tokens")) return this.tokens.find(r=>
          r.provider===args[0]&&r.account_identifier===args[1]
          &&(!sql.includes("is_active=1")||r.is_active===1))||null;
        if(sql.includes("FROM accounts WHERE email=")) return this.accounts.find(r=>r.email===args[0])||null;
        if(sql.includes("FROM accounts WHERE id=")) return this.accounts.find(r=>r.id===args[0])||null;
        return null;
      },
      run:async()=> {
        if(sql.includes("INSERT INTO user_oauth_tokens")) {
          const [user_id,provider,account_identifier,expires_at,scope,metadata_json]=args;
          const exists=this.tokens.find(r=>r.user_id===user_id&&r.provider===provider&&r.account_identifier===account_identifier);
          if(exists) Object.assign(exists,{expires_at,scope,metadata_json,is_active:1});
          else this.tokens.push({user_id,provider,account_identifier,expires_at,scope,metadata_json,is_active:1});
          return {meta:{changes:1}};
        }
        if(sql.includes("INSERT OR IGNORE INTO accounts")) {
          const [id,display_name]=args;
          if(!this.accounts.some(r=>r.id===id))this.accounts.push({id,email:null,display_name,password_hash:null,status:"active"});
          return {meta:{changes:1}};
        }
        if(sql.includes("INSERT INTO accounts")) {
          const [id,email,display_name,password_hash]=args;
          if(this.accounts.some(r=>r.email===email))throw Error("duplicate account");
          this.accounts.push({id,email,display_name,password_hash,status:"active"});
          return {meta:{changes:1}};
        }
        if(sql.includes("UPDATE user_oauth_tokens SET is_active=0 WHERE provider=")) {
          this.tokens.filter(r=>r.provider===args[0]&&r.account_identifier===args[1]).forEach(r=>r.is_active=0);
          return {meta:{changes:1}};
        }
        if(sql.includes("UPDATE user_oauth_tokens SET") && sql.includes("metadata_json=?")) {
          const [metadata_json,user_id,provider,key]=args;
          const rec=this.tokens.find(r=>r.user_id===user_id&&r.provider===provider&&
            r.account_identifier===key&&r.is_active===1&&r.expires_at>Date.now()/1000);
          if(!rec)return {meta:{changes:0}};
          Object.assign(rec,{metadata_json,is_active:0,revoked_at:Math.floor(Date.now()/1000)});
          return {meta:{changes:1}};
        }
        if(sql.includes("UPDATE user_oauth_tokens SET is_active=0,revoked_at=")) {
          const found=this.tokens.find(r=>r.user_id===args[0]&&r.provider===args[1]&&r.account_identifier===args[2]
            &&r.is_active===1&&r.expires_at>Date.now()/1000);
          if(found){found.is_active=0;return{meta:{changes:1}}}
          return {meta:{changes:0}};
        }
        throw Error("unhandled D1 statement: "+sql.slice(0,80));
      }
    })};
  }
}
function fixture(){
  const db=new MemoryD1();
  return {db,env:{DB:db as any,SERVICE_NAME:"agentsam-plugin-mcp",SERVICE_ENV:"test",OAUTH_SIGNING_SECRET:secret,STUDIO_HANDOFF_SECRET:"shared-studio-handoff-test-secret-9876543210-extra-long"} satisfies Env};
}
const encode=(data:Record<string,string>)=>new URLSearchParams(data).toString();
const challenge=(verifier:string)=>createHash("sha256").update(verifier).digest("base64url");
const request=(path:string,env:Env,init:RequestInit={})=>app.request(origin+path,init,env);
describe("standalone AgentSam OAuth issuer",()=>{
  it("uses the same origin and actual MCP scopes",async()=>{
    const {env}=fixture();
    const as=await read(await request("/.well-known/oauth-authorization-server",env));
    const pr=await read(await request("/.well-known/oauth-protected-resource",env));
    expect(as.issuer).toBe(origin);
    expect(as.registration_endpoint).toBe(origin+"/oauth/register");
    expect(pr.authorization_servers).toEqual([origin]);
    expect(pr.scopes_supported).toEqual(as.scopes_supported);
    expect(as.scopes_supported).toContain("offline_access");
  });

  it("registers a client, requires consent, enforces PKCE, rotates refresh, and denies code replay",async()=>{
    const {env,db}=fixture();
    const registered=await request("/oauth/register",env,{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({client_name:"ChatGPT Pilot",redirect_uris:["https://chatgpt.com/oauth/callback"],token_endpoint_auth_method:"none"})});
    expect(registered.status).toBe(201);
    const client=await read(registered);
    const verifier=randomBytes(40).toString("base64url");
    const query={client_id:client.client_id,redirect_uri:"https://chatgpt.com/oauth/callback",
      response_type:"code",resource:origin+"/mcp",scope:"campaign:read",
      code_challenge:challenge(verifier),code_challenge_method:"S256",state:"test-state"};
    const consent=await request("/oauth/authorize?"+encode(query),env);
    expect(consent.status).toBe(200);
    const html=await consent.text();
    expect(html).toContain("ChatGPT Pilot");
    expect(html).toContain("campaign:read");
    expect(html).not.toContain("campaign:brief:write");
    const csrf=html.match(/name="_csrf" value="([^"]+)"/)?.[1];
    expect(csrf).toBeTruthy();
    const approved=await request("/oauth/authorize",env,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded","cookie":`__Host-ags_csrf=${csrf}`},
      body:encode({...query,_csrf:csrf!,email:"test.user@example.test",
        password:"Test-password-strong-123456",decision:"signup"})});
    expect(approved.status).toBe(303);
    expect(db.accounts).toHaveLength(1);
    expect(db.accounts[0].password_hash).toMatch(/^pbkdf2-sha256:100000:/);
    const redirect=new URL(approved.headers.get("location")!);
    expect(redirect.origin).toBe("https://chatgpt.com");
    const code=redirect.searchParams.get("code");
    expect(code).toBeTruthy();
    const tokenForm={grant_type:"authorization_code",client_id:client.client_id,
      redirect_uri:query.redirect_uri,code:code!,code_verifier:verifier,resource:query.resource};
    const codeResponse=await request("/oauth/token",env,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},body:encode(tokenForm)});
    expect(codeResponse.status).toBe(200);
    const tokens=await read(codeResponse);
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();
    const userinfo=await request("/oauth/userinfo",env,{headers:{authorization:"Bearer "+tokens.access_token}});
    expect(userinfo.status).toBe(200);
    expect((await read(userinfo)).scopes).toEqual(["campaign:read"]);
    const replay=await request("/oauth/token",env,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},body:encode(tokenForm)});
    expect(replay.status).toBe(400);
    const rotated=await request("/oauth/token",env,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body:encode({grant_type:"refresh_token",client_id:client.client_id,refresh_token:tokens.refresh_token})});
    expect(rotated.status).toBe(200);
    const newTokens=await read(rotated);
    expect(newTokens.refresh_token).not.toBe(tokens.refresh_token);
    const replayRefresh=await request("/oauth/token",env,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body:encode({grant_type:"refresh_token",client_id:client.client_id,refresh_token:tokens.refresh_token})});
    expect(replayRefresh.status).toBe(400);
  });

  it("uses the current Studio session for consent without requesting another password",async()=>{
    const {env,db}=fixture();
    const redirect="https://agentsam.inneranimalmedia.com/api/plugins/oauth/callback";
    const register=await request("/oauth/register",env,{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({client_name:"AgentSam Studio",redirect_uris:[redirect]})});
    const client=await read(register);
    const verifier=randomBytes(40).toString("base64url");
    const subject="au_"+"a".repeat(22);
    const query={client_id:client.client_id,response_type:"code",redirect_uri:redirect,
      resource:origin+"/mcp",scope:"campaign:read",state:randomBytes(32).toString("base64url"),
      code_challenge:challenge(verifier),code_challenge_method:"S256"};
    const assertion={user_id:subject,display_name:"Studio User",email:"studio@example.test",...query};
    const noAuth=await request("/oauth/studio/handoff",env,{method:"POST",
      headers:{"content-type":"application/json"},body:JSON.stringify(assertion)});
    expect(noAuth.status).toBe(401);
    const bridge=await request("/oauth/studio/handoff",env,{method:"POST",
      headers:{"content-type":"application/json",
        "x-agentsam-studio-handoff-secret":env.STUDIO_HANDOFF_SECRET!},
      body:JSON.stringify(assertion)});
    expect(bridge.status).toBe(200);
    const hint=(await read(bridge)).login_hint;
    const params={...query,login_hint:hint};
    const consent=await request("/oauth/authorize?"+encode(params),env);
    expect(consent.status).toBe(200);
    const html=await consent.text();
    expect(html).toContain("Studio User");
    expect(html).toContain("Authorize and return to Studio");
    expect(html).not.toContain('id="password"');
    expect(db.accounts).toHaveLength(0);
    const csrf=html.match(/name="_csrf" value="([^"]+)"/)?.[1]!;
    const approved=await request("/oauth/authorize",env,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded","cookie":"__Host-ags_csrf="+csrf},
      body:encode({...params,_csrf:csrf,decision:"studio_approve"})});
    expect(approved.status).toBe(303);
    expect(db.accounts).toEqual([expect.objectContaining({
      id:subject,email:null,display_name:"Studio User",password_hash:null,
    })]);
    expect(html).toContain("/catalog/icons/agentsam.svg");
    expect(html).toContain('class="mark-icon"');
    const repeated=await request("/oauth/authorize",env,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded","cookie":"__Host-ags_csrf="+csrf},
      body:encode({...params,_csrf:csrf,decision:"studio_approve"})});
    expect(repeated.status).toBe(303);
    expect(repeated.headers.get("location")).toEqual(approved.headers.get("location"));
    expect(db.accounts).toHaveLength(1);
    expect(db.tokens.filter(t=>t.provider==="agentsam_issuer_code")).toHaveLength(1);
    const code=new URL(approved.headers.get("location")!).searchParams.get("code")!;
    const token=await request("/oauth/token",env,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body:encode({grant_type:"authorization_code",client_id:client.client_id,code,
        code_verifier:verifier,redirect_uri:redirect,resource:query.resource})});
    expect(token.status).toBe(200);
    const bearer=(await read(token)).access_token;
    const user=await read(await request("/oauth/userinfo",env,{
      headers:{authorization:"Bearer "+bearer}}));
    expect(user.sub).toBe(subject);
    const replay=await request("/oauth/authorize",env,{method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded","cookie":"__Host-ags_csrf="+csrf},
      body:encode({...params,_csrf:csrf,decision:"studio_approve"})});
    expect(replay.status).toBe(401);
    expect(await replay.text()).toContain("Start a fresh connection");
    const mismatch=await request("/oauth/authorize?"+encode({...params,state:"changed-state"}),env);
    expect(mismatch.status).toBe(401);
  });
});
