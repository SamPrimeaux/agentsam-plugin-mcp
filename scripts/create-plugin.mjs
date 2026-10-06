#!/usr/bin/env node
/**
 * Creates a non-publishable draft; never silently exposes MCP capabilities.
 * A plugin enters plugins/ only when its route, handlers, scopes, review cases,
 * and real install/authorization tests are complete.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const key=args[0];
const titleFlag=args.indexOf('--title');
const displayName=titleFlag>=0 ? args[titleFlag+1] : null;
if (!key || !/^agentsam-[a-z][a-z0-9-]{1,60}$/.test(key) || !displayName || displayName.length>80 || !displayName.trim()) {
  console.error('Usage: npm run plugin:create -- agentsam-unique-slug --title "Display Name"');
  process.exit(2);
}
if (args.some((arg,i)=>i!==0 && i!==titleFlag && i!==titleFlag+1)) {
  throw new Error('unsupported_argument');
}
const root=path.join(repo,'drafts',key);
if (fs.existsSync(root) || fs.existsSync(path.join(repo,'plugins',key))) throw new Error('plugin_already_exists');
fs.mkdirSync(path.join(root,'skills','getting-started'),{recursive:true});
const manifest={
  name:key,
  version:'0.1.0',
  description:'TODO: Describe the real, evidence-backed capability.',
  author:{name:'Inner Animal Media',url:'https://inneranimalmedia.com'},
  extensions:{'com.openai':{interface:{
    displayName:displayName.trim(),
    shortDescription:'TODO: public value proposition',
    longDescription:'TODO: explain capabilities and evidence sources',
    developerName:'Inner Animal Media',
    category:'Productivity',
    capabilities:[],
    defaultPrompt:[],
  },onboardingSkill:'./skills/getting-started/SKILL.md'}},
};
fs.writeFileSync(path.join(root,'plugin.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'mcp.json'),JSON.stringify({
  mcpServers:{[key.replaceAll('-','_')]:{
    type:'streamable-http',
    url:'https://REPLACE_WITH_VERIFIED_PUBLIC_HOST/mcp/'+key.replace(/^agentsam-/,''),
  }}
},null,2)+'\n');
fs.writeFileSync(path.join(root,'skills','getting-started','SKILL.md'),
  '# '+displayName.trim()+'\n\nDraft only. Define direct, indirect, error, and out-of-scope cases after the MCP tools and authorization policy exist.\n');
fs.writeFileSync(path.join(root,'IMPLEMENTATION.md'),`# ${displayName.trim()} · promotion checklist

This draft is intentionally **not** imported into the live MCP catalog.

- [ ] Build and publish the portable domain package where its actual authority belongs.
- [ ] Implement a narrow public tool catalog with input/output schemas, scopes, and read/write risk.
- [ ] Implement and test tool handlers using authorized user/workspace evidence.
- [ ] Register the real endpoint in src/index.ts and tool definitions in src/mcp/catalog.ts.
- [ ] Configure OAuth audience, scope enforcement, account resolution and approval/receipts for writes.
- [ ] Replace the example endpoint in mcp.json with the verified HTTPS endpoint.
- [ ] Fill manifests with real capabilities, 5 positive + 3 negative review cases, examples, and legal URLs.
- [ ] Graduate this directory to plugins/${key} only after verification, then run catalog:generate and test:all.
- [ ] Verify live endpoint, auth, tools/list, connection status, installed tool execution and release provenance.
`);
console.log('Draft created: '+path.relative(repo,root));
