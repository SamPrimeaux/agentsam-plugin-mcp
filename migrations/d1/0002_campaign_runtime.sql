PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS public_campaign_briefs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public_workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  brief_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS public_campaign_concepts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public_workspaces(id) ON DELETE CASCADE,
  brief_id TEXT REFERENCES public_campaign_briefs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  concept_json TEXT NOT NULL,
  evaluation_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS public_campaign_outcomes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public_workspaces(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES public_campaign_concepts(id) ON DELETE SET NULL,
  source_key TEXT,
  outcome_json TEXT NOT NULL,
  observed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_public_campaign_briefs_workspace
  ON public_campaign_briefs(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_campaign_concepts_workspace
  ON public_campaign_concepts(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_campaign_outcomes_workspace
  ON public_campaign_outcomes(workspace_id, observed_at DESC);
