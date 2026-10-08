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
  studio:"agentsam_studio_handoff",
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
type StudioIdentity = {
  user_id: string; display_name: string; email?: string;
  client_id: string; redirect_uri: string; resource: string;
  code_challenge: string; scope: string; state: string;
};
function secureEquals(a: string, b: string) {
  const aa=encode.encode(a),bb=encode.encode(b);
  if(aa.length!==bb.length)return false;
  let difference=0;
  for(let i=0;i<aa.length;i++)difference|=aa[i]^bb[i];
  return difference===0;
}
function matchedStudioHandoff(meta:StudioIdentity, auth:NonNullable<Awaited<ReturnType<typeof validatedAuth>>>) {
  return meta.client_id===auth.clientId && meta.redirect_uri===auth.redirect
    && meta.resource===auth.resource && meta.code_challenge===auth.challenge
    && meta.scope===auth.scopes.join(" ") && meta.state===auth.state;
}
async function studioHandoff(env:Env, hint:string, auth:NonNullable<Awaited<ReturnType<typeof validatedAuth>>>) {
  if(!/^[A-Za-z0-9_-]{40,80}$/.test(hint))return null;
  const record=await row(env,provider.studio,await digest(hint));
  if(!record||Number(record.expires_at)<=now())return null;
  const meta=JSON.parse(String(record.metadata_json||"{}")) as StudioIdentity;
  if(!matchedStudioHandoff(meta,auth))return null;
  return {record,meta};
}
/** Server-to-server handoff from authenticated Studio only. Never trust a browser's claimed identity. */
export async function issueStudioHandoff(request:Request,env:Env) {
  if(!env.STUDIO_HANDOFF_SECRET || env.STUDIO_HANDOFF_SECRET.length<48) return failure("studio_handoff_unavailable",503);
  const presented=request.headers.get("x-agentsam-studio-handoff-secret")||"";
  if(!secureEquals(presented,env.STUDIO_HANDOFF_SECRET))return failure("unauthorized",401);
  const data:any=await request.json().catch(()=>null);
  if(!data||typeof data!=="object"||Array.isArray(data)||
     typeof data.user_id!=="string"||!/^au_[a-z0-9]{16,64}$/.test(data.user_id)||
     typeof data.client_id!=="string"||typeof data.redirect_uri!=="string"||
     typeof data.resource!=="string"||typeof data.code_challenge!=="string"||
     typeof data.scope!=="string"||typeof data.state!=="string")return failure("invalid_handoff",400);
  const userId=String(data.user_id);
  const client=await clientFor(env,data.client_id);
  const scopes=requestedScopes(data.scope);
  const callback=new URL(data.redirect_uri);
  if(!client||!client.redirect_uris?.includes(data.redirect_uri)||
     !validRedirect(data.redirect_uri)||callback.protocol!=="https:"||
     callback.pathname!=="/api/plugins/oauth/callback"||
     data.resource!==audienceFor(request)||
     !validScopes(scopes)||!/^[A-Za-z0-9_-]{43,128}$/.test(data.code_challenge)||
     data.state.length<20||data.state.length>512)return failure("invalid_handoff",400);
  const identity:StudioIdentity={
    user_id:userId,
    display_name:String(data.display_name||"AgentSam account").slice(0,100),
    email:typeof data.email==="string"?String(data.email).slice(0,240):undefined,
    client_id:data.client_id,redirect_uri:data.redirect_uri,
    scope:scopes.join(" "),resource:data.resource,
    state:data.state,code_challenge:data.code_challenge,
  };
  const handoff=randomToken();
  await save(env,provider.studio,await digest(handoff),userId,identity,now()+540);
  return Response.json({login_hint:handoff,expires_in:540},{headers:{"cache-control":"no-store"}});
}

/** Encrypt the one-use post-approval redirect receipt, never persist a raw OAuth code. */
async function receiptKey(env:Env) {
  const root=secretKey(env);
  const material=new Uint8Array(await crypto.subtle.digest("SHA-256",encode.encode("agentsam/studio-redirect-receipt/v1:"+new TextDecoder().decode(root))));
  return crypto.subtle.importKey("raw",material,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encryptReceipt(env:Env, code:string, handoffHash:string) {
  const nonce=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({
    name:"AES-GCM",iv:nonce,additionalData:encode.encode(handoffHash)
  },await receiptKey(env),encode.encode(code));
  return b64(nonce)+"."+b64(new Uint8Array(encrypted));
}
async function decryptReceipt(env:Env, data:string, handoffHash:string) {
  try {
    const parts=data.split(".");
    if(parts.length!==2)return null;
    const decrypted=await crypto.subtle.decrypt({
      name:"AES-GCM",iv:decodeB64(parts[0]),additionalData:encode.encode(handoffHash)
    },await receiptKey(env),decodeB64(parts[1]));
    return new TextDecoder().decode(decrypted);
  }catch{return null}
}
async function commitStudioApproval(env:Env, hint:string, linked:{record:Record<string,any>;meta:StudioIdentity}, code:string) {
  const hash=await digest(hint);
  const meta={...linked.meta,approval_receipt:await encryptReceipt(env,code,hash)};
  const result=await env.DB.prepare(`UPDATE user_oauth_tokens SET
    is_active=0,revoked_at=unixepoch(),updated_at=unixepoch(),metadata_json=?
    WHERE user_id=? AND provider=? AND account_identifier=?
    AND is_active=1 AND expires_at>unixepoch()`)
    .bind(JSON.stringify(meta),String(linked.record.user_id),provider.studio,hash).run();
  return Number(result.meta.changes||0)===1;
}
async function priorStudioApproval(env:Env, hint:string, auth:NonNullable<Awaited<ReturnType<typeof validatedAuth>>>) {
  if(!/^[A-Za-z0-9_-]{40,80}$/.test(hint))return null;
  const hash=await digest(hint);
  const prior=await env.DB.prepare("SELECT * FROM user_oauth_tokens WHERE provider=? AND account_identifier=? LIMIT 1")
    .bind(provider.studio,hash).first<Record<string,any>>();
  if(!prior||Number(prior.is_active)!==0||Number(prior.revoked_at)<=0
    ||now()-Number(prior.revoked_at)>120||Number(prior.expires_at)<=now())return null;
  const meta=JSON.parse(String(prior.metadata_json||"{}")) as StudioIdentity&{approval_receipt?:string};
  if(!matchedStudioHandoff(meta,auth)||!meta.approval_receipt)return null;
  const code=await decryptReceipt(env,meta.approval_receipt,hash);
  if(!code)return null;
  const pending=await row(env,provider.code,await digest(code));
  return pending&&Number(pending.expires_at)>now()?code:null;
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
const oauthHeaders = {"cache-control":"no-store","content-security-policy":"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'","x-content-type-options":"nosniff"};
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
function consentHtml(auth: NonNullable<Awaited<ReturnType<typeof validatedAuth>>>,
  csrf:string, params:URLSearchParams, linked?:StudioIdentity, error="") {
  const labels=new Map(PUBLIC_TOOL_CATALOG.flatMap(t=>t.scopes.map(scope=>[scope,t.description] as const)));
  const scopes=auth.scopes.map(scope=>{
    const write=scope.includes(":write");
    const explanation=scope==="offline_access"
      ?"Keeps the connection active without asking you to sign in again."
      :(labels.get(scope)||"Use this permission for approved plugin tools.");
    return `<li class="scope"><span class="risk ${write?"write":"read"}">${write?"Write":"Read"}</span>
      <span><strong>${htmlEscape(scope)}</strong><small>${htmlEscape(explanation)}</small></span></li>`;
  }).join("");
  const hidden=[...params.entries()].filter(([key])=>
    ["client_id","redirect_uri","response_type","resource","scope","state",
     "code_challenge","code_challenge_method","login_hint"].includes(key))
    .map(([key,value])=>`<input type="hidden" name="${htmlEscape(key)}" value="${htmlEscape(value)}">`).join("");
  const clientName=htmlEscape(auth.client.client_name||"Connected application");
  const studio=Boolean(linked);
  const initials=(linked?.display_name||"").trim().split(/\s+/)
    .slice(0,2).map(part=>part.charAt(0).toUpperCase()).join("")||"•";
  const label=auth.scopes.some(s=>s.startsWith("campaign:"))?"Campaign":
              auth.scopes.some(s=>s.startsWith("brand:"))?"Brand":"Plugin";
  const title=studio?`Connect AgentSam ${label}`:`Authorize AgentSam ${label}`;
  const identity=studio?`<div class="identity"><span class="avatar">${htmlEscape(initials)}</span><span>
      <strong>${htmlEscape(linked?.display_name||"AgentSam account")}</strong>
      <small>Signed in to AgentSam Studio${linked?.email?` · ${htmlEscape(linked.email)}`:""}</small></span>
      <span class="verified" aria-label="Verified Studio session">✓</span></div>`:`
      <div class="auth-fields">
      <label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" maxlength="240" required>
      <label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" minlength="12" required>
      </div>`;
  const actions=studio?`
    <button class="primary" name="decision" value="studio_approve" type="submit">Authorize and return to Studio <span aria-hidden="true">↗</span></button>
    <button class="secondary" name="decision" value="deny" type="submit" formnovalidate>Cancel</button>`:`
    <button class="primary" name="decision" value="signin" type="submit">Sign in and authorize</button>
    <button class="secondary" name="decision" value="signup" type="submit">Create AgentSam account</button>
    <button class="quiet" name="decision" value="deny" type="submit" formnovalidate>Cancel</button>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="dark"><title>${htmlEscape(title)} · AgentSam</title><style>
    *{box-sizing:border-box}html{background:#090a10}body{margin:0;min-height:100vh;color:#f4f2fb;
    background:radial-gradient(ellipse 70% 55% at 50% 17%,#4e29a02b,transparent 76%),#090a10;
    font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;display:grid;place-items:center;padding:32px 16px}
    main{width:min(100%,480px);background:#14141b;border:1px solid #34313e;
    box-shadow:0 24px 90px #0007;border-radius:22px;padding:30px}
    .brand{display:flex;align-items:center;gap:10px;color:#c7c1d4;font-size:12px;letter-spacing:.025em;font-weight:600}
    .mark{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;
    background:#7b39e7;color:#fff}
    .mark-icon{width:25px;height:23px;display:block;background:currentColor;
    -webkit-mask:url('/catalog/icons/agentsam.svg') center / contain no-repeat;
    mask:url('/catalog/icons/agentsam.svg') center / contain no-repeat}
    h1{margin:24px 0 8px;font-size:25px;line-height:1.23;letter-spacing:-.6px}
    .subtitle{color:#a9a5b7;margin:0 0 24px}.scope-head{display:flex;justify-content:space-between;
    color:#eeeaf6;font-size:13px;font-weight:650;margin:22px 0 10px}.count{color:#9690a7;font-weight:500}
    ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}.scope{display:flex;gap:12px;align-items:start;
    padding:12px;border:1px solid #302e39;border-radius:12px;background:#1a1923}
    .scope strong{font-size:12px;font-weight:650;overflow-wrap:anywhere}.scope small{display:block;
    font-size:11px;line-height:1.5;color:#a19cad;margin-top:3px}.risk{flex-shrink:0;margin-top:1px;
    font-size:10px;border-radius:6px;padding:3px 7px;font-weight:700}
    .risk.read{background:#17334b;color:#9cd2ff}.risk.write{background:#403014;color:#f4c36c}
    .identity{display:flex;align-items:center;gap:12px;background:#211d30;border:1px solid #4f3a77;
    padding:12px;border-radius:12px;margin-bottom:5px}.avatar{display:grid;place-items:center;width:37px;height:37px;
    border-radius:11px;background:#7343d4;color:white;font-weight:800}.identity strong{display:block}
    .identity small{display:block;color:#b9afcf;font-size:11px;margin-top:2px;overflow-wrap:anywhere}
    .verified{margin-left:auto;color:#b89aff}.auth-fields{margin-top:10px}
    label{display:block;font-size:12px;font-weight:600;margin:13px 0 6px}
    input:not([type=hidden]){width:100%;padding:12px 13px;border:1px solid #464253;
    background:#201e2a;color:white;border-radius:9px;font:inherit;outline-offset:2px}
    input:focus-visible,button:focus-visible{outline:2px solid #c5aaff;outline-offset:2px}
    button{cursor:pointer;border:0;border-radius:10px;padding:12px 16px;font:inherit;font-weight:650}
    .actions{display:grid;gap:9px;margin-top:21px}.primary{background:#8b46f4;color:white}
    .primary:hover{background:#9b63f9}.secondary{background:#2b2934;color:#e5e2eb;
    border:1px solid #46424e}.quiet{background:none;color:#a9a5b7}
    .foot{font-size:11px;color:#858092;margin:20px 0 0}.error{padding:10px;border-radius:9px;
    background:#3b1c28;color:#ffb9c7;margin:14px 0}a{color:#bca1ff}
    @media(max-width:500px){body{padding:12px}main{border-radius:16px;padding:21px}h1{font-size:23px}}
    </style></head><body><main><div class="brand"><span class="mark"><span class="mark-icon" role="img" aria-label="AgentSam"></span></span> AGENTSAM <span aria-hidden="true">/</span> CONNECTIONS</div>
    <h1>${title}</h1><p class="subtitle">${studio?"Your Studio session is verified. Review what you're sharing before continuing.":`Connect ${clientName} to your AgentSam workspace.`}</p>
    ${identity}${error?`<div role="alert" class="error">${htmlEscape(error)}</div>`:""}
    <div class="scope-head"><span>Requested permissions</span><span class="count">${auth.scopes.length} permissions</span></div>
    <ul>${scopes}</ul><form action="/oauth/authorize" method="post">${hidden}
    <input type="hidden" name="_csrf" value="${htmlEscape(csrf)}">
    ${studio?"":`<p class="foot">For connections outside AgentSam Studio, sign in with an existing AgentSam plugin account.</p>`}
    <div class="actions">${actions}</div></form>
    <p class="foot">Connecting ${clientName}. Approval grants only the permissions shown above.
    You can disconnect from Studio Settings at any time.</p></main></body></html>`;
}
function expiredStudioConsent(auth:NonNullable<Awaited<ReturnType<typeof validatedAuth>>>) {
  const back=new URL("/settings/customize?view=plugins",auth.redirect).href;
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Connection needs a fresh approval · AgentSam</title>
  <style>*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;
    background:radial-gradient(ellipse at 50% 18%,#4a25963b,transparent 70%),#090a10;
    color:#f7f5fb;font:15px/1.6 system-ui,-apple-system,sans-serif;padding:16px}
  main{width:min(100%,460px);background:#15141d;border:1px solid #3c3649;
    border-radius:20px;padding:30px;box-shadow:0 24px 70px #0008}
  .brand{display:flex;align-items:center;gap:10px;color:#c8bed8;font-size:12px;font-weight:700}
  .mark{display:block;width:32px;height:32px;background:#bc9cfa;
    -webkit-mask:url('/catalog/icons/agentsam.svg') center / contain no-repeat;
    mask:url('/catalog/icons/agentsam.svg') center / contain no-repeat}
  h1{font-size:23px;line-height:1.3;letter-spacing:-.3px;margin:24px 0 8px}
  p{color:#bcb4c8;margin:0 0 20px}
  a{display:block;text-align:center;text-decoration:none;background:#8546ef;color:white;
    border-radius:10px;padding:12px;font-weight:700}
  a:focus-visible{outline:2px solid #fff;outline-offset:4px}
  </style></head><body><main><div class="brand"><span class="mark" role="img" aria-label="AgentSam"></span>
    AGENTSAM / CONNECTIONS</div><h1>Start a fresh connection</h1>
    <p>This approval link has already been used or has expired. Return to AgentSam Studio
      and select Connect again. Your account remains signed in.</p>
    <a href="${htmlEscape(back)}">Return to Studio Settings →</a></main></body></html>`;
  return new Response(html,{status:401,headers:{...oauthHeaders,
    "content-type":"text/html; charset=utf-8"}});
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
  const hint=params.get("login_hint");
  const linked=hint?await studioHandoff(env,hint,auth):null;
  if(hint&&!linked) {
    if(post&&params.get("decision")==="studio_approve") {
      const cookie=/(?:^|;\s*)__Host-ags_csrf=([^;]+)/.exec(request.headers.get("cookie")||"")?.[1];
      if(!cookie||cookie!==params.get("_csrf")||! /^[A-Za-z0-9_-]{40,55}$/.test(cookie))
        return failure("invalid_csrf",403);
      const code=await priorStudioApproval(env,hint,auth);
      if(code)return Response.redirect(callbackUrl(auth,{code}),303);
    }
    return expiredStudioConsent(auth);
  }
  if (post) {
    const decision=params.get("decision");
    if(decision==="deny") return Response.redirect(callbackUrl(auth,{error:"access_denied"}),303);
    const cookie=/(?:^|;\s*)__Host-ags_csrf=([^;]+)/.exec(request.headers.get("cookie")||"")?.[1];
    if(!cookie || cookie!==params.get("_csrf") || !/^[A-Za-z0-9_-]{40,55}$/.test(cookie))
      return failure("invalid_csrf",403);
    let account:any;
    if (linked) {
      if(decision!=="studio_approve")return failure("invalid_decision");
      const identity=linked.meta;
      // Mirror the *existing Studio account ID* for plugin workspace storage;
      // no password, separate signup, or additional login is created.
      await env.DB.prepare(`INSERT OR IGNORE INTO accounts
        (id,type,email,display_name,password_hash,status)
        VALUES (?,'human',NULL,?,NULL,'active')`)
        .bind(identity.user_id,identity.display_name||"AgentSam account").run();
      account=await env.DB.prepare("SELECT id,status FROM accounts WHERE id=? LIMIT 1")
        .bind(identity.user_id).first();
      if(!account||account.status!=="active")return failure("studio_identity_unavailable",403);
    } else {
      const email=String(params.get("email")||"").trim().toLowerCase();
      const password=String(params.get("password")||"");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>240 || password.length<12 || password.length>200)
        return failure("invalid_credentials",401);
      const attemptKey=await digest(email);
      const attempt=await row(env,provider.attempt,attemptKey);
      if (attempt && Number(attempt.expires_at)>now() &&
          Number(JSON.parse(String(attempt.metadata_json||"{}")).count||0)>=6)
        return failure("too_many_attempts",429);
      account=await env.DB.prepare("SELECT id,email,display_name,password_hash,status FROM accounts WHERE email=? LIMIT 1").bind(email).first();
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
    }
    const code=randomToken();
    await save(env,provider.code,await digest(code),String(account.id),{
      client_id:auth.clientId,redirect_uri:auth.redirect,resource:auth.resource,code_challenge:auth.challenge
    },now()+CODE_SECONDS,auth.scopes.join(" "));
    if(linked&&!await commitStudioApproval(env,hint!,linked,code)) {
      const original=await priorStudioApproval(env,hint!,auth);
      if(!original)return failure("studio_connection_expired",401);
      return Response.redirect(callbackUrl(auth,{code:original}),303);
    }
    // POST/Redirect/GET: 303 avoids a browser re-POSTing consent on navigation.
    return Response.redirect(callbackUrl(auth,{code}),303);
  }
  const csrf=randomToken();
  return new Response(consentHtml(auth,csrf,params,linked?.meta),{headers:{
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
