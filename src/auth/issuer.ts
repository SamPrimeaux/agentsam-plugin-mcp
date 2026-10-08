/**
 * First-party OAuth 2.1 authorization server for AgentSam's standalone public
 * plugin Worker. No dependency on IAM or another application Worker.
 * Reuses accounts and user_oauth_tokens in the plugin's existing D1 database.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { PUBLIC_TOOL_CATALOG } from "../mcp/catalog";
import type { Env } from "../types";

const AUDIENCE_PATH = "/mcp";
const ACCESS_SECONDS = 900;
const REFRESH_SECONDS = 30 * 86400;
const CODE_SECONDS = 600;
// Cloudflare Workers WebCrypto rejects PBKDF2 counts above 100,000.
const ITERATIONS = 100000;
const encode = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);
const id = (prefix: string) => prefix + crypto.randomUUID().replaceAll("-", "");
const randomToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const digest = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encode.encode(s))))
  .map(b => b.toString(16).padStart(2, "0")).join("");
const challengeFor = async (verifier: string) => btoa(String.fromCharCode(
  ...new Uint8Array(await crypto.subtle.digest("SHA-256", encode.encode(verifier)))
)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const htmlEscape = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c] || c);
const supported = () => [...new Set(["offline_access",...PUBLIC_TOOL_CATALOG.flatMap(t => t.scopes)])].sort();
const failure = (error: string, status = 400) => Response.json({error}, {status, headers:{"cache-control":"no-store"}});
const secretKey = (env: Env) => {
  if (!env.OAUTH_SIGNING_SECRET || env.OAUTH_SIGNING_SECRET.length < 48) throw new Error("oauth_signing_secret_unavailable");
  return encode.encode(env.OAUTH_SIGNING_SECRET);
};
const provider = {
  client:"agentsam_issuer_client",
  code:"agentsam_issuer_code",
  refresh:"agentsam_issuer_refresh",
  attempt:"agentsam_issuer_attempt",
};
const baseFor = (request: Request) => new URL(request.url).origin;
const audienceFor = (request: Request) => baseFor(request) + AUDIENCE_PATH;
function validRedirect(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 2048) return false;
  try {
    const u = new URL(raw);
    if (u.username || u.password || u.hash) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch { return false; }
}
async function row(env: Env, kind: string, key: string) {
  return env.DB.prepare("SELECT * FROM user_oauth_tokens WHERE provider=? AND account_identifier=? AND is_active=1 LIMIT 1")
    .bind(kind,key).first<Record<string, any>>();
}
async function save(env: Env, kind: string, key: string, owner: string, metadata: unknown, expiry: number, scope = "") {
  await env.DB.prepare(`INSERT INTO user_oauth_tokens
    (user_id,provider,account_identifier,expires_at,scope,metadata_json,is_active)
    VALUES(?,?,?,?,?,?,1)
    ON CONFLICT(user_id,provider,account_identifier) DO UPDATE SET
    expires_at=excluded.expires_at,scope=excluded.scope,metadata_json=excluded.metadata_json,
    updated_at=unixepoch(),is_active=1,revoked_at=NULL`)
    .bind(owner,kind,key,expiry,scope,JSON.stringify(metadata)).run();
}
async function consume(env: Env, kind: string, key: string, owner: string) {
  const result = await env.DB.prepare(`UPDATE user_oauth_tokens SET is_active=0,revoked_at=unixepoch(),
    updated_at=unixepoch() WHERE user_id=? AND provider=? AND account_identifier=? AND
    is_active=1 AND expires_at>unixepoch()`).bind(owner,kind,key).run();
  return Number(result.meta.changes || 0) === 1;
}
async function hashedPassword(password: string, salt?: Uint8Array) {
  const currentSalt = salt || crypto.getRandomValues(new Uint8Array(24));
  const key = await crypto.subtle.importKey("raw",encode.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    {name:"PBKDF2",salt:new Uint8Array(currentSalt).buffer,iterations:ITERATIONS,hash:"SHA-256"},key,256
  ));
  return "pbkdf2-sha256:" + ITERATIONS + ":" + b64(currentSalt) + ":" + b64(bits);
}
function decodeB64(s: string) {
  const raw = atob(s.replace(/-/g,"+").replace(/_/g,"/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function verifyPassword(value: string, stored: string) {
  const fields = String(stored||"").split(":");
  if (fields.length!==4 || fields[0]!=="pbkdf2-sha256" || Number(fields[1])!==ITERATIONS) return false;
  const candidate = await hashedPassword(value,decodeB64(fields[2]));
  const a = encode.encode(candidate), b = encode.encode(stored);
  if (a.length !== b.length) return false;
  let delta=0; for(let i=0;i<a.length;i++) delta |= a[i]^b[i];
  return delta===0;
}
async function clientFor(env: Env, clientId: string) {
  const r=await row(env,provider.client,clientId);
  return r ? JSON.parse(String(r.metadata_json||"{}")) : null;
}
function validScopes(scopes: string[]) {
  const values=new Set(supported());
  return scopes.length > 0 && scopes.length < 30 && scopes.every(s=>values.has(s));
}
function requestedScopes(raw: string) {return [...new Set(raw.trim().split(/\s+/).filter(Boolean))];}
async function validatedAuth(env: Env, values: URLSearchParams, request: Request) {
  const clientId=values.get("client_id")||"";
  const client=await clientFor(env,clientId);
  if (!client) return null;
  const redirect=values.get("redirect_uri")||"";
  if (!client.redirect_uris?.includes(redirect)) return null;
  const scopes=requestedScopes(values.get("scope")||"");
  const challenge=values.get("code_challenge")||"";
  const resource=values.get("resource")||audienceFor(request);
  if (!validScopes(scopes) || resource!==audienceFor(request) ||
      values.get("response_type")!=="code" || values.get("code_challenge_method")!=="S256" ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) return null;
  if ((values.get("state")||"").length > 512) return null;
  return {clientId,client,redirect,scopes,challenge,resource,state:values.get("state")||""};
}
const oauthHeaders = {"cache-control":"no-store","content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'","x-content-type-options":"nosniff"};
export function oauthMetadata(request: Request) {
  const issuer=baseFor(request);
  return Response.json({
    issuer,authorization_endpoint:issuer+"/oauth/authorize",token_endpoint:issuer+"/oauth/token",
    registration_endpoint:issuer+"/oauth/register",userinfo_endpoint:issuer+"/oauth/userinfo",revocation_endpoint:issuer+"/oauth/revoke",
    response_types_supported:["code"],grant_types_supported:["authorization_code","refresh_token"],
    token_endpoint_auth_methods_supported:["none"],code_challenge_methods_supported:["S256"],
    scopes_supported:supported(),client_id_metadata_document_supported:false
  },{headers:{"cache-control":"public, max-age=300"}});
}
export async function registerOAuthClient(request: Request,env: Env) {
  if (!env.OAUTH_SIGNING_SECRET) return failure("issuer_unavailable",503);
  const body:any=await request.json().catch(()=>null);
  if(!body || !Array.isArray(body.redirect_uris) || !body.redirect_uris.length ||
    body.redirect_uris.length>8 || !body.redirect_uris.every(validRedirect) ||
    !["none",undefined].includes(body.token_endpoint_auth_method) ||
    (body.grant_types && (!Array.isArray(body.grant_types) || !body.grant_types.includes("authorization_code"))))
    return failure("invalid_client_metadata");
  const name=String(body.client_name||"OAuth MCP Client").slice(0,100).trim();
  const redirectUris=[...new Set(body.redirect_uris)].sort();
  const clientId="ags_dcr_"+(await digest(JSON.stringify([redirectUris,name]))).slice(0,40);
  const client={client_id:clientId,client_name:name,redirect_uris:redirectUris,
    logo_uri:typeof body.logo_uri==="string"&&validRedirect(body.logo_uri)?body.logo_uri:null};
  await save(env,provider.client,clientId,"issuer",client,4102444800);
  return Response.json({...client,client_id_issued_at:now(),token_endpoint_auth_method:"none",
    grant_types:["authorization_code","refresh_token"],response_types:["code"]},
    {status:201,headers:{"cache-control":"no-store"}});
}
function consentHtml(auth: NonNullable<Awaited<ReturnType<typeof validatedAuth>>>, csrf: string, params: URLSearchParams, error="") {
  const labels=new Map(PUBLIC_TOOL_CATALOG.flatMap(t=>t.scopes.map(scope=>[scope,{label:scope,description:t.description}] as const)));
  const scopeMarkup=auth.scopes.map(scope=>{
    const description=scope==="offline_access"?"Keep this connection active using refresh tokens.":(labels.get(scope)?.description||scope);
    const write=scope.includes(":write");
    return `<li><span class="perm ${write?"write":"read"}">${write?"Write":"Read"}</span> <strong>${htmlEscape(scope)}</strong><small>${htmlEscape(description)}</small></li>`;
  }).join("");
  const hidden=[...params.entries()].filter(([k])=>["client_id","redirect_uri","response_type","resource","scope","state","code_challenge","code_challenge_method"].includes(k))
    .map(([k,v])=>`<input type="hidden" name="${htmlEscape(k)}" value="${htmlEscape(v)}">`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Authorize ${htmlEscape(auth.client.client_name)} · AgentSam</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;display:grid;place-items:center;background:#0b1020;color:#19202b;font:14px/1.55 system-ui,-apple-system,sans-serif}
  main{width:min(100%,470px);background:#fff;border-radius:20px;padding:28px;box-shadow:0 18px 70px #0005}
  h1{font-size:23px;line-height:1.25;margin:8px 0}p{color:#5b6574}label{display:block;margin:12px 0 5px;font-weight:600}input:not([type=hidden]){display:block;width:100%;border:1px solid #cbd2dd;border-radius:8px;padding:12px;font:inherit}
  ul{list-style:none;padding:0}li{padding:10px;border:1px solid #e5e9f0;border-radius:9px;margin:7px 0}li small{display:block;color:#5d6878;margin-top:3px}
  .perm{font-size:11px;border-radius:5px;padding:3px 5px;margin-right:5px}.write{background:#fff0dc;color:#975500}.read{background:#e8f2ff;color:#195bb7}
  button{border:0;border-radius:9px;background:#5437d6;color:white;padding:12px 16px;font:inherit;font-weight:650;cursor:pointer}
  .buttons{display:flex;gap:9px;margin-top:18px;flex-wrap:wrap}.cancel{background:#ebedf3;color:#1b2434}.muted{font-size:12px;color:#687284}
  .error{color:#aa1a21;background:#ffebed;padding:9px;border-radius:8px}
  </style></head><body><main><div class="muted">AGENTSAM · SECURE AUTHORIZATION</div>
  <h1>${htmlEscape(auth.client.client_name)} wants to connect to AgentSam</h1>
  <p>Sign in with an AgentSam account, then approve only the permissions below.</p>
  <ul>${scopeMarkup}</ul>${error?`<p class="error">${htmlEscape(error)}</p>`:""}
  <form action="/oauth/authorize" method="post">${hidden}
  <input type="hidden" name="_csrf" value="${htmlEscape(csrf)}">
  <label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" maxlength="240" required>
  <label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" minlength="12" required>
  <div class="buttons"><button name="decision" value="signin">Sign in and authorize</button>
  <button name="decision" value="signup">Create account and authorize</button>
  <button name="decision" value="deny" class="cancel" formnovalidate>Cancel</button></div>
  <p class="muted">Creating an account does not verify ownership of the entered email address. Review permissions before authorizing. You can disconnect this plugin later.</p></form>
  </main></body></html>`;
}
function callbackUrl(auth: NonNullable<Awaited<ReturnType<typeof validatedAuth>>>, value: Record<string,string>) {
  const u=new URL(auth.redirect);
  Object.entries(value).forEach(([k,v])=>u.searchParams.set(k,v));
  if(auth.state)u.searchParams.set("state",auth.state);
  return u.href;
}
export async function authorizeOAuth(request: Request,env: Env) {
  if (!env.OAUTH_SIGNING_SECRET) return failure("issuer_unavailable",503);
  const post=request.method==="POST";
  const params=post?new URLSearchParams(await request.text()):new URL(request.url).searchParams;
  const auth=await validatedAuth(env,params,request);
  if(!auth) return failure("invalid_request");
  if (post) {
    const decision=params.get("decision");
    if(decision==="deny") return Response.redirect(callbackUrl(auth,{error:"access_denied"}),302);
    const cookie=/(?:^|;\s*)__Host-ags_csrf=([^;]+)/.exec(request.headers.get("cookie")||"")?.[1];
    if(!cookie || cookie!==params.get("_csrf") || !/^[A-Za-z0-9_-]{40,55}$/.test(cookie))
      return failure("invalid_csrf",403);
    const email=String(params.get("email")||"").trim().toLowerCase();
    const password=String(params.get("password")||"");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>240 || password.length<12 || password.length>200)
      return failure("invalid_credentials",401);
    const attemptKey=await digest(email);
    const attempt=await row(env,provider.attempt,attemptKey);
    if (attempt && Number(attempt.expires_at)>now() &&
        Number(JSON.parse(String(attempt.metadata_json||"{}")).count||0)>=6)
      return failure("too_many_attempts",429);
    let account:any=await env.DB.prepare("SELECT id,email,display_name,password_hash,status FROM accounts WHERE email=? LIMIT 1").bind(email).first();
    if (decision==="signup") {
      if (account) return failure("account_exists",409);
      const accountId=id("au_");
      try {
        await env.DB.prepare("INSERT INTO accounts (id,type,email,display_name,password_hash,status) VALUES (?,'human',?,?,?,'active')")
          .bind(accountId,email,email.split("@")[0],await hashedPassword(password)).run();
      } catch(error) {
        console.warn("oauth_signup_insert_failed",String(error instanceof Error ? error.message : error).slice(0,180));
        return failure("account_creation_unavailable",503);
      }
      account={id:accountId,email,display_name:email.split("@")[0],status:"active"};
    } else {
      if (!account || account.status!=="active" || !await verifyPassword(password,String(account.password_hash||""))) {
        const count=(Number(JSON.parse(String(attempt?.metadata_json||"{}")).count||0))+1;
        await save(env,provider.attempt,attemptKey,"issuer",{count},now()+900);
        return failure("invalid_credentials",401);
      }
    }
    await env.DB.prepare("UPDATE user_oauth_tokens SET is_active=0 WHERE provider=? AND account_identifier=?").bind(provider.attempt,attemptKey).run();
    const code=randomToken();
    await save(env,provider.code,await digest(code),String(account.id),{
      client_id:auth.clientId,redirect_uri:auth.redirect,resource:auth.resource,code_challenge:auth.challenge
    },now()+CODE_SECONDS,auth.scopes.join(" "));
    return Response.redirect(callbackUrl(auth,{code}),302);
  }
  const csrf=randomToken();
  return new Response(consentHtml(auth,csrf,params),{headers:{
    ...oauthHeaders,"content-type":"text/html; charset=utf-8",
    "set-cookie":`__Host-ags_csrf=${csrf}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`
  }});
}
async function issueTokens(request:Request,env:Env,userId:string,clientId:string,scopes:string[],resource:string) {
  const key=secretKey(env);
  const jti=id("at_");
  const access=await new SignJWT({scope:scopes.join(" "),scp:scopes})
    .setProtectedHeader({alg:"HS256",typ:"at+jwt"}).setIssuer(baseFor(request)).setAudience(resource)
    .setSubject(userId).setIssuedAt().setExpirationTime(now()+ACCESS_SECONDS).setJti(jti).sign(key);
  const refresh=randomToken();
  await save(env,provider.refresh,await digest(refresh),userId,{client_id:clientId,scopes,resource},now()+REFRESH_SECONDS,scopes.join(" "));
  return Response.json({access_token:access,refresh_token:refresh,token_type:"Bearer",
    expires_in:ACCESS_SECONDS,scope:scopes.join(" ")},{headers:{"cache-control":"no-store","pragma":"no-cache"}});
}
export async function exchangeOAuthToken(request:Request,env:Env) {
  if (!env.OAUTH_SIGNING_SECRET) return failure("issuer_unavailable",503);
  const body=new URLSearchParams(await request.text());
  const grant=body.get("grant_type");
  const clientId=body.get("client_id")||"";
  if (!await clientFor(env,clientId)) return failure("invalid_client",401);
  if (grant==="authorization_code") {
    const code=body.get("code")||"";
    const verifier=body.get("code_verifier")||"";
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(verifier)) return failure("invalid_grant");
    const hash=await digest(code), saved=await row(env,provider.code,hash);
    if (!saved || Number(saved.expires_at)<=now()) return failure("invalid_grant");
    const metadata=JSON.parse(String(saved.metadata_json||"{}"));
    if (metadata.client_id!==clientId || metadata.redirect_uri!==body.get("redirect_uri") ||
        metadata.resource!==audienceFor(request) ||
        (body.has("resource") && body.get("resource")!==metadata.resource) ||
        await challengeFor(verifier)!==metadata.code_challenge) return failure("invalid_grant");
    if (!await consume(env,provider.code,hash,String(saved.user_id))) return failure("invalid_grant");
    return issueTokens(request,env,String(saved.user_id),clientId,requestedScopes(String(saved.scope||"")),metadata.resource);
  }
  if (grant==="refresh_token") {
    const hash=await digest(body.get("refresh_token")||"");
    const saved=await row(env,provider.refresh,hash);
    if (!saved || Number(saved.expires_at)<=now()) return failure("invalid_grant");
    const metadata=JSON.parse(String(saved.metadata_json||"{}"));
    if (metadata.client_id!==clientId || metadata.resource!==audienceFor(request) ||
        (body.has("resource") && body.get("resource")!==metadata.resource)) return failure("invalid_grant");
    if (!await consume(env,provider.refresh,hash,String(saved.user_id))) return failure("invalid_grant");
    return issueTokens(request,env,String(saved.user_id),clientId,metadata.scopes,metadata.resource);
  }
  return failure("unsupported_grant_type");
}
export async function verifyIssuerToken(request:Request,env:Env,token:string):Promise<JWTPayload> {
  const checked=await jwtVerify(token,secretKey(env),{issuer:baseFor(request),audience:audienceFor(request),
    algorithms:["HS256"],clockTolerance:10});
  const account=await env.DB.prepare("SELECT id,status FROM accounts WHERE id=? LIMIT 1").bind(checked.payload.sub||"").first();
  if(!account || account.status!=="active") throw new Error("invalid_token_account");
  return checked.payload;
}
export async function issuerUserinfo(request:Request,env:Env) {
  const token=/^Bearer\s+(.+)$/i.exec(request.headers.get("authorization")||"")?.[1];
  if(!token) return failure("invalid_token",401);
  try {
    const claims=await verifyIssuerToken(request,env,token);
    const account=await env.DB.prepare("SELECT email,display_name FROM accounts WHERE id=?").bind(claims.sub||"").first<any>();
    return Response.json({sub:claims.sub,name:account?.display_name,email:account?.email,
      audience:audienceFor(request),scopes:requestedScopes(String(claims.scope||""))},
      {headers:{"cache-control":"no-store"}});
  } catch { return failure("invalid_token",401); }
}
export async function revokeOAuthToken(request:Request,env:Env) {
  const values=new URLSearchParams(await request.text());
  const token=values.get("token")||"";
  const saved=await row(env,provider.refresh,await digest(token));
  if (saved) await consume(env,provider.refresh,await digest(token),String(saved.user_id));
  return new Response(null,{status:200,headers:{"cache-control":"no-store"}});
}
