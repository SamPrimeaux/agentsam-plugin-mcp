PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS public_users (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS public_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0,1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(provider_key, provider_subject)
);

CREATE TABLE IF NOT EXISTS public_workspaces (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES public_users(id),
  display_name TEXT NOT NULL,
  slug TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS public_plugin_installations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES public_workspaces(id) ON DELETE CASCADE,
  plugin_key TEXT NOT NULL,
  plugin_version TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  config_json TEXT NOT NULL DEFAULT '{}',
  installed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, workspace_id, plugin_key)
);

CREATE TABLE IF NOT EXISTS public_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES public_workspaces(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  connection_kind TEXT NOT NULL,
  secret_ref TEXT,
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'connected',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS public_brand_contracts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public_workspaces(id) ON DELETE CASCADE,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  contract_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS public_tool_receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public_users(id),
  workspace_id TEXT REFERENCES public_workspaces(id),
  plugin_key TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  risk TEXT NOT NULL,
  status TEXT NOT NULL,
  request_id TEXT,
  error_code TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_public_plugin_installations_user
  ON public_plugin_installations(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_public_connections_workspace
  ON public_connections(workspace_id, provider_key);
CREATE INDEX IF NOT EXISTS idx_public_brand_contracts_workspace
  ON public_brand_contracts(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_tool_receipts_workspace
  ON public_tool_receipts(workspace_id, created_at DESC);
