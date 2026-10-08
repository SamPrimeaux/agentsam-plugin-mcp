#!/usr/bin/env node
/**
 * Builds public, read-only discovery metadata from the *real* packaged
 * plugin.json + mcp.json files. Never advertises unregistered MCP routes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'plugins');
const dest = path.join(root, 'src/generated/plugin-catalog.ts');
const check = process.argv.includes('--check');
const plugins = [];
const icons = {};
// First-party publisher mark: packaged SVG, not an arbitrary remote image.
const publisherMarkSvg = fs.readFileSync(path.join(root, 'assets/agentsam-mark.svg'), 'utf8');
if (publisherMarkSvg.length > 8000 || !/^<svg[\\s>]/.test(publisherMarkSvg.trim()) ||
    /<script|<foreignObject|<image|<use|href=|url\(/i.test(publisherMarkSvg)) {
  throw new Error('catalog_publisher_svg_invalid');
}
const routes = fs.readFileSync(path.join(root, 'src/index.ts'), 'utf8');
const categories = new Set(['Productivity', 'Development', 'Design', 'Marketing', 'Data', 'Communication', 'Other']);
const entries = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name));
for (const entry of entries) {
  const base = path.join(dir, entry.name);
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'plugin.json'), 'utf8'));
  const mcp = JSON.parse(fs.readFileSync(path.join(base, 'mcp.json'), 'utf8'));
  const servers = Object.values(mcp.mcpServers ?? {});
  if (servers.length !== 1 || servers[0].type !== 'streamable-http') throw new Error('catalog_requires_one_http_server:'+entry.name);
  const endpoint = new URL(servers[0].url);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('catalog_endpoint_invalid:'+entry.name);
  }
  // This catalog only advertises endpoints explicitly registered in THIS Worker.
  if (!routes.includes('app.all("'+endpoint.pathname+'"')) throw new Error('catalog_route_unregistered:'+endpoint.pathname);
  if (manifest.name !== entry.name || !/^agentsam-[a-z0-9-]+$/.test(entry.name)) throw new Error('catalog_manifest_identity_invalid:'+entry.name);
  const i = manifest.extensions?.['com.openai']?.interface;
  if (!i || !i.displayName || !Array.isArray(i.capabilities)) throw new Error('catalog_interface_missing:'+entry.name);
  const toolFile = path.join(root, 'src/plugins',entry.name.replace(/^agentsam-/, ''),'tools.ts');
  if (!fs.existsSync(toolFile)) throw new Error('catalog_tools_not_registered:'+entry.name);
  const tools = fs.readFileSync(toolFile,'utf8');
  const toolIds = [...tools.matchAll(/\bid:\s*"([a-z][a-z0-9_.]+)"/g)].map(m=>m[1]);
  if (toolIds.length < 1 || new Set(toolIds).size !== toolIds.length) throw new Error('catalog_tools_invalid:'+entry.name);
  const skillDir = path.join(base,'skills');
  const skillNames = fs.readdirSync(skillDir,{withFileTypes:true}).filter(e=>e.isDirectory() && fs.existsSync(path.join(skillDir,e.name,'SKILL.md'))).map(e=>e.name).sort();
  const rawPrompts = Array.isArray(i.defaultPrompt) ? i.defaultPrompt : [];
  if (rawPrompts.some(s=>typeof s !== 'string')) throw new Error('catalog_prompt_invalid:'+entry.name);
  const iconRef = i.logo || i.composerIcon;
  const iconFile = typeof iconRef === 'string' && iconRef.startsWith('./assets/')
    ? path.resolve(base,iconRef) : '';
  if (!iconFile || !iconFile.startsWith(path.join(base,'assets')+path.sep)) throw new Error('catalog_icon_path_invalid:'+entry.name);
  const iconBytes = fs.readFileSync(iconFile);
  if (iconBytes.length < 8 || iconBytes.length > 80_000 || iconBytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('catalog_icon_png_invalid:'+entry.name);
  }
  icons[entry.name] = iconBytes.toString('base64');
  plugins.push({
    plugin_key: manifest.name,
    version: manifest.version,
    display_name: String(i.displayName),
    short_description: String(i.shortDescription || manifest.description || ''),
    description: String(i.longDescription || manifest.description || ''),
    developer_name: String(i.developerName || manifest.author?.name || ''),
    category: categories.has(i.category) ? i.category : 'Other',
    keywords: (manifest.keywords||[]).filter(s=>typeof s==='string').slice(0,16),
    capabilities: i.capabilities.map(String).slice(0,20),
    example_prompts: rawPrompts.slice(0,6),
    skill_count: skillNames.length,
    tool_count: toolIds.length,
    tools: toolIds,
    endpoint_url: endpoint.toString(),
    icon_url: endpoint.origin+'/catalog/icons/'+manifest.name+'.png?v='+encodeURIComponent(manifest.version),
    transport: 'streamable-http',
    auth_type: 'oauth',
    website_url: String(i.websiteURL || manifest.homepage || ''),
    support_url: String(i.supportURL || ''),
    privacy_url: String(i.privacyPolicyURL || ''),
    terms_url: String(i.termsOfServiceURL || ''),
    repository_url: String(manifest.repository || ''),
  });
}
const catalog = {
  schema: 'agentsam.plugin-catalog/v1',
  publisher: 'Inner Animal Media',
  plugins,
};
const result = '/** Generated from packaged plugin manifests; do not edit. */\nexport const PUBLIC_PLUGIN_CATALOG = '+JSON.stringify(catalog,null,2)+' as const;\nexport const PUBLIC_PLUGIN_ICONS: Record<string,string> = '+JSON.stringify(icons,null,2)+';\n';
if (check) {
  if (!fs.existsSync(dest) || fs.readFileSync(dest,'utf8') !== result) {
    console.error('plugin catalog drift: run npm run catalog:generate');
    process.exit(1);
  }
  console.log('plugin catalog verified:',plugins.length);
} else {
  fs.writeFileSync(dest,result);
  console.log('plugin catalog generated:',plugins.map(p=>p.plugin_key).join(', '));
}
