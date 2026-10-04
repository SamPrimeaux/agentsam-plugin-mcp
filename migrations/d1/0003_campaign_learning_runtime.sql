PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS public_campaign_experiments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public_workspaces(id) ON DELETE CASCADE,
  brief_id TEXT REFERENCES public_campaign_briefs(id) ON DELETE SET NULL,
  concept_id TEXT REFERENCES public_campaign_concepts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  experiment_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS public_campaign_learnings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public_workspaces(id) ON DELETE CASCADE,
  outcome_id TEXT REFERENCES public_campaign_outcomes(id) ON DELETE SET NULL,
  source_key TEXT,
  learning_json TEXT NOT NULL,
  observed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_public_campaign_experiments_workspace
  ON public_campaign_experiments(workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_campaign_learnings_workspace
  ON public_campaign_learnings(workspace_id, observed_at DESC, updated_at DESC);
