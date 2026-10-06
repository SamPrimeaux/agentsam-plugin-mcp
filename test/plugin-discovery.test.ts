import { describe, expect, it } from 'vitest';
import app from '../src/index';
import { PUBLIC_PLUGIN_CATALOG } from '../src/generated/plugin-catalog';
import { PUBLIC_TOOL_CATALOG } from '../src/mcp/catalog';

describe('public plugin discovery', () => {
  it('serves the manifest icon assets with a strict allowlist', async () => {
    const ok = await app.request('/catalog/icons/agentsam-brand.png');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('image/png');
    const content = new Uint8Array(await ok.arrayBuffer());
    expect(content.length).toBeGreaterThan(500);
    expect([...content.slice(0,4)]).toEqual([137,80,78,71]);
    const missing = await app.request('/catalog/icons/invalid.png');
    expect(missing.status).toBe(404);
  });

  it('serves the generated catalog without login or secrets', async () => {
    const response = await app.request('/catalog/plugins');
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    const payload = await response.json() as {schema:string;plugins:Array<(typeof PUBLIC_PLUGIN_CATALOG.plugins)[number] & {tool_permissions:Array<{id:string;scopes:string[];read_only:boolean;requires_approval:boolean}>;oauth_resource:string;read_only_scopes:string[];oauth_scopes:string[]}>};
    expect(payload.schema).toBe('agentsam.plugin-catalog/v1');
    expect(payload.plugins.map(p=>p.plugin_key)).toEqual(['agentsam-brand', 'agentsam-campaign']);
    for (const plugin of payload.plugins) {
      expect(plugin.endpoint_url).toMatch(/^https:\/\//);
      expect(plugin.auth_type).toBe('oauth');
      expect(plugin.example_prompts.length).toBeGreaterThan(0);
      expect(plugin.capabilities.length).toBeGreaterThan(0);
      expect(plugin.tool_count).toBeGreaterThan(0);
      expect(plugin.tools.length).toBe(plugin.tool_count);
      expect(plugin.tool_permissions.length).toBe(plugin.tool_count);
      expect(plugin.oauth_resource).toBe('https://agentsam-plugin-mcp.meauxbility.workers.dev/mcp');
      expect(plugin.read_only_scopes.length).toBeGreaterThan(0);
      expect(plugin.oauth_scopes.length).toBeGreaterThanOrEqual(plugin.read_only_scopes.length);
      for (const tool of plugin.tool_permissions) {
        expect(plugin.tools).toContain(tool.id);
        expect(tool.scopes.length).toBeGreaterThan(0);
        expect(tool.requires_approval).toBe(!tool.read_only);
      }
      for (const id of plugin.tools) {
        expect(PUBLIC_TOOL_CATALOG.some(tool=>tool.id===id && tool.plugin===plugin.plugin_key)).toBe(true);
      }
    }
    expect(JSON.stringify(payload)).not.toMatch(/client_secret|private_key|break_glass|vault_master_key/i);
  });
});
