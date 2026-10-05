import {
  registerAppResource,
  RESOURCE_MIME_TYPE
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/server";
import type { PublicToolSurface } from "../mcp/catalog";

export const BRAND_SNAPSHOT_URI = "ui://agentsam-brand/snapshot-v1.html";
export const CAMPAIGN_COMPARE_URI = "ui://agentsam-campaign/concept-compare-v1.html";

const STYLE = `
<style>
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;padding:14px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:CanvasText;background:Canvas}
.card{border:1px solid color-mix(in srgb,CanvasText 14%,transparent);border-radius:14px;padding:14px;background:color-mix(in srgb,Canvas 94%,CanvasText 6%)}
.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.09em;opacity:.65;margin-bottom:4px}
h2{font-size:18px;line-height:1.2;margin:0 0 10px}
.muted{opacity:.68;font-size:12px}
.row{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:7px 0;border-top:1px solid color-mix(in srgb,CanvasText 10%,transparent)}
.row:first-of-type{border-top:0}
.value{font-weight:650;text-align:right}
.pill{font-size:11px;border:1px solid color-mix(in srgb,CanvasText 14%,transparent);border-radius:999px;padding:3px 7px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.concept{border:1px solid color-mix(in srgb,CanvasText 12%,transparent);border-radius:12px;padding:11px}
.score{font-size:21px;font-weight:720;margin:4px 0}
</style>`;

const BRAND_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${STYLE}</head>
<body><main class="card" aria-live="polite">
<div class="eyebrow">AgentSam Brand</div><h2 id="title">Brand Snapshot</h2>
<div id="content" class="muted">Waiting for brand context…</div>
</main>
<script>
(function(){
  const content=document.getElementById("content");
  const title=document.getElementById("title");
  function esc(v){return String(v==null?"—":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function render(sc){
    const envelope=sc||{};
    const d=envelope.data||envelope;
    const w=d.workspace||{};
    const c=d.latestContract||{};
    const contract=c.contract||{};
    const conns=Array.isArray(d.connections)?d.connections:[];
    title.textContent=w.display_name||contract.name||contract.brand_name||"Brand Snapshot";
    content.className="";
    content.innerHTML=[
      '<div class="row"><span>Status</span><span class="pill">'+esc(c.status||"No contract")+'</span></div>',
      '<div class="row"><span>Contract</span><span class="value">'+esc(c.id||"Not defined")+'</span></div>',
      '<div class="row"><span>Evidence sources</span><span class="value">'+conns.length+'</span></div>',
      '<div class="row"><span>Last updated</span><span class="value">'+esc(c.updated_at||"—")+'</span></div>'
    ].join("");
  }
  window.addEventListener("message",function(event){
    if(event.source!==window.parent)return;
    const message=event.data;
    if(!message||message.jsonrpc!=="2.0")return;
    if(message.method==="ui/notifications/tool-result"){
      render(message.params&&message.params.structuredContent);
    }
  },{passive:true});
})();
</script></body></html>`;

const CAMPAIGN_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${STYLE}</head>
<body><main class="card" aria-live="polite">
<div class="eyebrow">AgentSam Campaign</div><h2>Concept Compare</h2>
<div id="content" class="muted">Waiting for ranked concepts…</div>
</main>
<script>
(function(){
  const content=document.getElementById("content");
  function esc(v){return String(v==null?"—":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function pct(v){const n=Number(v);return Number.isFinite(n)?Math.round(n*100)+"%":"—"}
  function render(sc){
    const envelope=sc||{};
    const d=envelope.data||envelope;
    const ranked=Array.isArray(d.ranked)?d.ranked:[];
    if(!ranked.length){content.className="muted";content.textContent="No ranked concepts returned.";return}
    content.className="grid";
    content.innerHTML=ranked.slice(0,4).map(function(row){
      const ev=row.evaluation||{};
      const concept=row.concept||{};
      const dims=ev.dimensions||{};
      return '<section class="concept"><div class="eyebrow">#'+esc(row.rank||"—")+'</div><strong>'+
        esc(concept.name||ev.concept_name||"Concept")+'</strong><div class="score">'+pct(ev.score)+
        '</div><div class="muted">Confidence '+pct(ev.confidence)+'</div>'+
        '<div class="row"><span>Brand</span><span>'+pct(dims.brand_fit&&dims.brand_fit.score)+'</span></div>'+
        '<div class="row"><span>Margin</span><span>'+pct(dims.margin_fit&&dims.margin_fit.score)+'</span></div>'+
        '<div class="row"><span>Evidence</span><span>'+pct(dims.evidence_quality&&dims.evidence_quality.score)+'</span></div></section>';
    }).join("");
  }
  window.addEventListener("message",function(event){
    if(event.source!==window.parent)return;
    const message=event.data;
    if(!message||message.jsonrpc!=="2.0")return;
    if(message.method==="ui/notifications/tool-result"){
      render(message.params&&message.params.structuredContent);
    }
  },{passive:true});
})();
</script></body></html>`;

function registerBrandSnapshot(server: McpServer) {
  registerAppResource(
    server,
    "agentsam-brand-snapshot",
    BRAND_SNAPSHOT_URI,
    {},
    async () => ({
      contents: [{
        uri: BRAND_SNAPSHOT_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: BRAND_HTML,
        _meta: { ui: { prefersBorder: true } }
      }]
    })
  );
}

function registerCampaignCompare(server: McpServer) {
  registerAppResource(
    server,
    "agentsam-campaign-concept-compare",
    CAMPAIGN_COMPARE_URI,
    {},
    async () => ({
      contents: [{
        uri: CAMPAIGN_COMPARE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: CAMPAIGN_HTML,
        _meta: { ui: { prefersBorder: true } }
      }]
    })
  );
}

export function registerUiResources(server: McpServer, surface: PublicToolSurface) {
  if (surface === "all" || surface === "brand") registerBrandSnapshot(server);
  if (surface === "all" || surface === "campaign") registerCampaignCompare(server);
}

export function toolUiMeta(toolId: string) {
  if (toolId === "brand.get_context") {
    return {
      ui: { resourceUri: BRAND_SNAPSHOT_URI, visibility: ["model", "app"] },
      "openai/outputTemplate": BRAND_SNAPSHOT_URI
    };
  }
  if (toolId === "campaign.concepts.rank") {
    return {
      ui: { resourceUri: CAMPAIGN_COMPARE_URI, visibility: ["model", "app"] },
      "openai/outputTemplate": CAMPAIGN_COMPARE_URI
    };
  }
  return {};
}
