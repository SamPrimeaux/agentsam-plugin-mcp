import type { Context } from "hono";
import type { Env } from "../types";

const UPDATED = "October 5, 2026";

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · AgentSam</title>
<style>
body{margin:0;background:#0b0c10;color:#f7f5fb;font:16px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:56px 24px 80px}
a{color:#8bd9ff}h1{font-size:36px;line-height:1.1}h2{margin-top:32px;font-size:20px}
p,li{color:#d7d3df}.meta{color:#aaa4b4;font-size:14px}.card{border:1px solid #292b35;border-radius:16px;padding:20px;background:#111219}
</style></head><body><main>
<p class="meta">AgentSam · Inner Animal Media</p><h1>${title}</h1>
<p class="meta">Last updated ${UPDATED}</p>${body}
</main></body></html>`;
}

export async function privacyRoute(c: Context<{ Bindings: Env }>) {
  return c.html(page("Privacy Policy", `
<h2>What these plugins process</h2>
<p>AgentSam Brand and AgentSam Campaign process information you provide in conversation and information you explicitly authorize through connected accounts. Depending on the tools you use, that can include account profile fields, workspace identifiers, brand assets and rules, product or inventory context, audience or performance evidence, campaign briefs, concepts, and outcome data.</p>
<h2>Authentication and credentials</h2>
<p>OAuth access tokens are used to validate your connected account with the authorization service. The public plugin service does not include raw credentials in tool results. Provider credentials are handled by the relevant authorization or connector system and are not exposed to the model.</p>
<h2>What we store</h2>
<p>We may store workspace records, approved Brand or Campaign artifacts, provider-neutral evidence metadata, and operational receipts needed for reliability and auditing. Tool receipts store bounded metadata such as capability, status, timing, and a cryptographic hash of input rather than a raw copy of the tool input.</p>
<h2>How information is used</h2>
<p>Information is used to provide the requested Brand or Campaign workflow, enforce authorization, preserve user-approved work, measure reliability, prevent abuse, and improve the service. Missing evidence is treated as missing rather than silently inferred as fact.</p>
<h2>Sharing and sale</h2>
<p>We do not sell personal information. Data may be processed by infrastructure and connected service providers only as needed to provide the functionality you request or to comply with law.</p>
<h2>Retention and control</h2>
<p>Stored plugin records are retained only as needed for the service, security, auditing, or user-approved workspace history. You can request access, correction, or deletion through support. Disconnecting a provider stops new access through that connection but may not automatically delete previously saved artifacts.</p>
<h2>Contact</h2>
<p>Questions or privacy requests: <a href="mailto:hey@inneranimalmedia.com">hey@inneranimalmedia.com</a>.</p>
`));
}

export async function termsRoute(c: Context<{ Bindings: Env }>) {
  return c.html(page("Terms of Service", `
<p>These terms apply to the AgentSam Brand and AgentSam Campaign public plugins provided by Inner Animal Media.</p>
<h2>Use of the service</h2>
<p>You may use the plugins to inspect authorized evidence, prepare plans or drafts, and perform only the bounded writes exposed by the installed product. You are responsible for having permission to connect accounts and use the data you provide.</p>
<h2>Authorization and external systems</h2>
<p>The plugins do not grant permission to systems you have not authorized. Write operations require the scope declared by the tool. Planning permission does not imply permission to publish, deploy, change a catalog, or operate unrelated infrastructure.</p>
<h2>Recommendations and outcomes</h2>
<p>Brand reviews and campaign evaluations are decision-support tools. Scores, forecasts, rankings, and recommendations are not guarantees of commercial, creative, or business outcomes. Evidence quality and missing information can affect recommendations.</p>
<h2>Third-party services</h2>
<p>Connected providers have their own terms and availability. AgentSam may be unable to complete a workflow when a provider is unavailable, authorization has expired, or required evidence is missing.</p>
<h2>Acceptable use</h2>
<p>Do not use the service to access data without authorization, evade security controls, interfere with systems, violate applicable law, or misrepresent generated recommendations as guaranteed results.</p>
<h2>Availability and changes</h2>
<p>We may update, suspend, or change plugin capabilities to maintain security, quality, compatibility, or legal compliance. Where practical, material behavior changes are reflected in release notes.</p>
<h2>Contact</h2>
<p>Support and terms questions: <a href="mailto:hey@inneranimalmedia.com">hey@inneranimalmedia.com</a>.</p>
`));
}

export async function supportRoute(c: Context<{ Bindings: Env }>) {
  return c.html(page("Support", `
<div class="card">
<h2>AgentSam Brand &amp; Campaign support</h2>
<p>For connection problems, authorization errors, incorrect or stale evidence, saved-workspace issues, or plugin review questions, email <a href="mailto:hey@inneranimalmedia.com">hey@inneranimalmedia.com</a>.</p>
<p>Include the plugin name, the approximate time of the issue, and the visible error message. Do not send access tokens, API keys, passwords, or other secrets.</p>
</div>
<h2>Product boundaries</h2>
<p>AgentSam Brand handles brand evidence, BrandContract work, asset review, consistency, and brand planning. AgentSam Campaign handles evidence-backed campaign briefs, concept evaluation, planning, and approved brief/concept saves. Neither public plugin exposes private operator terminal, database, repository, or infrastructure-administration tools.</p>
`));
}
