-- 0004_agentsam_plugin_registry_and_skill_runtime.sql
-- Additive AgentSam plugin registry and per-plugin skill/runtime metadata.
--
-- This migration does not drop, rename, or replace any existing public_* tables.
-- Registry rows do not automatically become public MCP tools. Public exposure
-- remains explicitly allowlisted in src/mcp/catalog.ts and src/mcp/dispatch.ts.
-- No plugin rows, OAuth grants, credentials, or installations are seeded here.
--
-- The agentsam D1 database already contains accounts(id); workflows uses that
-- existing identity authority and this migration does not create or alter it.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agentsam_plugins (
  id TEXT PRIMARY KEY DEFAULT ('plg_' || lower(hex(randomblob(8)))),
  plugin_key TEXT NOT NULL UNIQUE,
  family_key TEXT NOT NULL
    CHECK (family_key IN ('core','connections','commerce','build','brand-campaign')),
  version TEXT NOT NULL DEFAULT '1.0.0',
  provider_key TEXT NOT NULL,
  plugin_kind TEXT NOT NULL
    CHECK (plugin_kind IN ('mcp','api','oauth','native','webhook','database','storage','ai')),
  category TEXT NOT NULL DEFAULT 'integration',
  display_name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  mention_aliases_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(mention_aliases_json)),
  endpoint_url TEXT,
  transport TEXT NOT NULL
    CHECK (transport IN ('remote_jsonrpc','iam_mcp_catalog','http_rest','http_graphql','webhook','workers_binding','native','none')),
  auth_type TEXT NOT NULL DEFAULT 'none'
    CHECK (auth_type IN ('none','bridge','oauth','oauth_via_iam','bearer_secret','api_key_secret','workers_binding')),
  oauth_connect_url TEXT,
  capabilities_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(capabilities_json)),
  tool_lanes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tool_lanes_json)),
  config_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config_json)),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  icon_url TEXT,
  icon_alt TEXT,
  icon_fit TEXT NOT NULL DEFAULT 'contain' CHECK (icon_fit IN ('contain','cover')),
  composer_visible INTEGER NOT NULL DEFAULT 1 CHECK (composer_visible IN (0,1)),
  settings_visible INTEGER NOT NULL DEFAULT 1 CHECK (settings_visible IN (0,1)),
  sort_priority INTEGER NOT NULL DEFAULT 50,
  health_strategy TEXT NOT NULL DEFAULT 'adapter'
    CHECK (health_strategy IN ('none','adapter','mcp_ping','oauth_probe','provider_probe')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  icon_dark_url TEXT
);

CREATE TABLE IF NOT EXISTS agentsam_plugin_oauth_states (
  state_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  plugin_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  verifier_ciphertext TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  source_client TEXT NOT NULL DEFAULT 'web',
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS agentsam_plugin_oauth_grants (
  account_id TEXT NOT NULL,
  plugin_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  issuer_url TEXT NOT NULL,
  credentials_ciphertext TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  connected_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(account_id,plugin_id)
);

CREATE TABLE IF NOT EXISTS agentsam_plugin_installations (
  id TEXT PRIMARY KEY DEFAULT ('pinst_' || lower(hex(randomblob(8)))),
  account_id TEXT NOT NULL,
  plugin_id TEXT NOT NULL REFERENCES agentsam_plugins(id) ON DELETE CASCADE,
  instance_key TEXT NOT NULL DEFAULT 'default',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  setup_status TEXT NOT NULL DEFAULT 'unconfigured'
    CHECK (setup_status IN ('unconfigured','configured','connected','disabled')),
  secret_ref TEXT,
  resource_scope_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(resource_scope_json)),
  config_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config_json)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  health_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (health_status IN ('unknown','healthy','degraded','unhealthy','unreachable','auth_error','disabled')),
  last_health_at INTEGER,
  last_healthy_at INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms REAL,
  last_error_code TEXT,
  last_error_message TEXT,
  composer_visible INTEGER NOT NULL DEFAULT 1 CHECK (composer_visible IN (0,1)),
  settings_visible INTEGER NOT NULL DEFAULT 1 CHECK (settings_visible IN (0,1)),
  UNIQUE (account_id, plugin_id, instance_key)
);

CREATE TABLE IF NOT EXISTS agentsam_plugin_health_checks (
  id TEXT PRIMARY KEY DEFAULT ('plgh_' || lower(hex(randomblob(8)))),
  plugin_id TEXT NOT NULL REFERENCES agentsam_plugins(id) ON DELETE CASCADE,
  plugin_key TEXT NOT NULL,
  account_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  check_kind TEXT NOT NULL,
  check_source TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (check_source IN ('scheduled','manual','page_load','tool_call','deploy','startup')),
  status TEXT NOT NULL
    CHECK (status IN ('healthy','degraded','unhealthy','unreachable','auth_error')),
  started_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  latency_ms INTEGER,
  http_status INTEGER,
  provider_request_id TEXT,
  error_code TEXT,
  error_message TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS agentsam_skill (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slash_trigger TEXT NOT NULL
    CHECK (slash_trigger GLOB '/[a-z0-9][a-z0-9-]*'),
  npm_package_name TEXT,
  npm_version TEXT,
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  description TEXT NOT NULL DEFAULT '',
  content_markdown TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  content_checksum TEXT NOT NULL DEFAULT '',
  globs TEXT NOT NULL DEFAULT '[]',
  always_apply INTEGER NOT NULL DEFAULT 0,
  task_types_json TEXT NOT NULL DEFAULT '[]',
  route_keys_json TEXT NOT NULL DEFAULT '[]',
  access_mode TEXT NOT NULL DEFAULT 'read_write'
    CHECK (access_mode IN ('read_only','read_write')),
  icon TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  invocation_count INTEGER NOT NULL DEFAULT 0,
  last_invoked_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (account_id, slash_trigger),
  UNIQUE (npm_package_name, npm_version)
);

CREATE TABLE IF NOT EXISTS agentsam_tools (
  id TEXT PRIMARY KEY DEFAULT ('ast_' || lower(hex(randomblob(8)))),
  tool_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  tool_category TEXT NOT NULL,
  handler_type TEXT NOT NULL DEFAULT 'mcp'
    CHECK (handler_type IN (
      'mcp','r2','github','terminal','http','proxy','ai','d1',
      'hyperdrive','supabase','kv','durable_object','filesystem',
      'browser_agentic','mybrowser','websearch','telemetry','eval',
      'task.planner','task.organizer','task.manager','workspace.reader',
      'cf','deploy','git','memory','notify','workflow','agent',
      'browser','media','canvas','integrations','cms'
    )),
  description TEXT,
  input_schema TEXT,
  output_schema TEXT,
  linked_mcp_tool_id TEXT,
  mcp_service_url TEXT,
  handler_config TEXT DEFAULT '{}',
  intent_tags TEXT DEFAULT '[]',
  intent_category_tags TEXT,
  modes_json TEXT DEFAULT '["agent","plan","debug","multitask","ask"]',
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low','medium','high','critical')),
  requires_approval INTEGER NOT NULL DEFAULT 0,
  requires_confirmation INTEGER NOT NULL DEFAULT 0,
  token_budget_per_call INTEGER DEFAULT NULL,
  max_calls_per_session INTEGER DEFAULT NULL,
  cost_per_call_usd REAL DEFAULT 0.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_degraded INTEGER NOT NULL DEFAULT 0,
  failure_rate REAL DEFAULT 0.0,
  avg_latency_ms REAL DEFAULT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at INTEGER DEFAULT NULL,
  last_health_check INTEGER DEFAULT NULL,
  sort_priority INTEGER DEFAULT 50,
  subagent_profile_id TEXT DEFAULT NULL,
  schema_hint TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  is_global INTEGER DEFAULT 1,
  tool_key TEXT,
  capability_key TEXT,
  handler_key TEXT,
  task_type TEXT DEFAULT 'tool_use',
  domain TEXT DEFAULT 'general',
  capability_tier TEXT DEFAULT 'common',
  internal_seo TEXT DEFAULT '',
  tool_code TEXT DEFAULT NULL,
  oauth_visible INTEGER NOT NULL DEFAULT 0,
  dispatch_target TEXT NOT NULL DEFAULT 'internal',
  result_policy_json TEXT,
  caller_policy TEXT,
  cache_policy_json TEXT,
  updated_at_unix INTEGER,
  connector_visible INTEGER NOT NULL DEFAULT 0 CHECK (connector_visible IN (0,1)),
  connector_priority INTEGER,
  connector_access_class TEXT NOT NULL DEFAULT 'read'
    CHECK (connector_access_class IN ('read','write')),
  account_id TEXT,
  plugin_key TEXT,
  plugin_id TEXT REFERENCES agentsam_plugins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS agentsam_workflows (
  id TEXT PRIMARY KEY DEFAULT ('wf_' || lower(hex(randomblob(8)))),
  workflow_key TEXT NOT NULL CHECK (length(trim(workflow_key)) > 0),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  scope_type TEXT NOT NULL DEFAULT 'platform'
    CHECK (scope_type IN ('platform','account')),
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) > 0),
  description TEXT,
  entry_node_key TEXT,
  lifecycle TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle IN ('draft','active','disabled','retired')),
  input_schema_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(input_schema_json)),
  output_schema_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(output_schema_json)),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  ui_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(ui_json)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK (
    (scope_type='platform' AND account_id IS NULL)
    OR
    (scope_type='account' AND account_id IS NOT NULL)
  )
);

-- Explicit many-to-many association: the existing skill record remains the
-- canonical skill body; this relation assigns it to one or more plugin packages.
-- This avoids inventing a second skill-body table or changing agentsam_skill.
CREATE TABLE IF NOT EXISTS agentsam_plugin_skills (
  plugin_id TEXT NOT NULL REFERENCES agentsam_plugins(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES agentsam_skill(id) ON DELETE CASCADE,
  source_path TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0,1)),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (plugin_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_agentsam_plugins_family_sort
  ON agentsam_plugins(family_key, sort_priority, plugin_key);
CREATE INDEX IF NOT EXISTS idx_agentsam_plugin_oauth_states_account_expiry
  ON agentsam_plugin_oauth_states(account_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_agentsam_plugin_oauth_grants_account
  ON agentsam_plugin_oauth_grants(account_id, plugin_id);
CREATE INDEX IF NOT EXISTS idx_agentsam_plugin_installations_account
  ON agentsam_plugin_installations(account_id, enabled, setup_status);
CREATE INDEX IF NOT EXISTS idx_agentsam_plugin_installations_plugin
  ON agentsam_plugin_installations(plugin_id, account_id);
CREATE INDEX IF NOT EXISTS idx_agentsam_plugin_health_checks_account_plugin_time
  ON agentsam_plugin_health_checks(account_id, plugin_key, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_skill_account_active
  ON agentsam_skill(account_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_agentsam_tools_plugin_active
  ON agentsam_tools(plugin_id, is_active, sort_priority);
CREATE INDEX IF NOT EXISTS idx_agentsam_workflows_scope_updated
  ON agentsam_workflows(scope_type, account_id, lifecycle, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agentsam_plugin_skills_skill
  ON agentsam_plugin_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_agentsam_plugin_skills_plugin_order
  ON agentsam_plugin_skills(plugin_id, is_enabled, sort_order);
