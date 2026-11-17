export interface SalesWorkflow {
  key: string; title: string; summary: string; steps: readonly string[]; outputs: readonly string[];
}

export const SALES_WORKFLOWS: readonly SalesWorkflow[] = [
  {
    "key": "company_research",
    "title": "Company research",
    "summary": "Build an evidence-backed view of a target company before outreach or a sales decision.",
    "steps": [
      "Identify the exact legal or trading entity and distinguish it from similarly named organizations.",
      "Use current public sources and authorized workspace material; record source dates and direct evidence.",
      "Summarize products, business model, likely priorities, relevant changes, and credible fit with the proposed offer.",
      "Separate verified facts, reasonable hypotheses, and unanswered questions. Do not invent revenue, headcount, buying intent, or technology usage."
    ],
    "outputs": [
      "Company snapshot",
      "Relevant business signals",
      "Evidence and source dates",
      "Fit hypotheses",
      "Open questions"
    ]
  },
  {
    "key": "prospect_enrichment",
    "title": "Prospect and contact enrichment",
    "summary": "Resolve prospect identity and role using reliable public or authorized sources.",
    "steps": [
      "Confirm the company and role before associating a person with an account.",
      "Use only business-relevant, non-sensitive professional information from reliable sources.",
      "Record source and date for each material fact; mark missing details instead of guessing.",
      "Do not infer private contact details, sensitive traits, or personal circumstances."
    ],
    "outputs": [
      "Verified identity and role",
      "Professional context",
      "Source-backed contact notes",
      "Unverified fields"
    ]
  },
  {
    "key": "account_signals",
    "title": "Account signal review",
    "summary": "Review meaningful changes in an account without overstating what those changes imply.",
    "steps": [
      "Establish the prior known state and the date range being reviewed.",
      "Compare current public and authorized workspace evidence with that baseline.",
      "Classify each change as confirmed, possible, or unverified and explain why it matters.",
      "Recommend a proportionate next step; do not label a signal as buying intent without direct evidence."
    ],
    "outputs": [
      "What changed",
      "Why it may matter",
      "Evidence and confidence",
      "Suggested next action"
    ]
  },
  {
    "key": "meeting_preparation",
    "title": "Sales meeting preparation",
    "summary": "Prepare a concise, source-grounded brief for an upcoming customer or partner meeting.",
    "steps": [
      "Use the current calendar event and authorized email, document, and account context when available.",
      "Confirm attendee names, roles, meeting purpose, prior commitments, and unresolved questions from sources.",
      "Separate customer-stated needs from internal hypotheses.",
      "Prepare an agenda, useful questions, relevant proof points, and a clear desired outcome."
    ],
    "outputs": [
      "Meeting objective",
      "Attendee context",
      "Prior commitments",
      "Agenda and questions",
      "Desired outcome"
    ]
  },
  {
    "key": "call_follow_up",
    "title": "Call follow-up",
    "summary": "Turn supplied notes or an authorized transcript into a precise follow-up draft and action list.",
    "steps": [
      "Extract decisions, customer-stated needs, objections, commitments, owners, and dates.",
      "Distinguish explicit commitments from suggested next steps.",
      "Draft a concise follow-up that reflects the conversation without adding unsupported promises.",
      "Do not send the message or create external tasks unless a separate authorized tool is available and the user approves."
    ],
    "outputs": [
      "Follow-up draft",
      "Decision summary",
      "Action owners and dates",
      "Open questions"
    ]
  },
  {
    "key": "deal_strategy",
    "title": "Deal strategy",
    "summary": "Assess a deal using the evidence actually available and identify the next useful action.",
    "steps": [
      "Confirm the stated deal stage, stakeholders, customer problem, decision process, timing, and commercial constraints.",
      "Identify evidence gaps, competing priorities, blockers, and risks.",
      "Recommend a next step tied to a customer outcome and an accountable owner.",
      "Do not invent deal values, close probabilities, procurement status, or forecast dates."
    ],
    "outputs": [
      "Deal snapshot",
      "Stakeholder map",
      "Risks and evidence gaps",
      "Next best action"
    ]
  },
  {
    "key": "pipeline_review",
    "title": "Pipeline review",
    "summary": "Review a supplied or authorized pipeline dataset without fabricating missing CRM fields.",
    "steps": [
      "Use only the exact rows, filters, date range, currency, and stage definitions supplied by an authoritative source.",
      "Reconcile counts and totals before drawing conclusions.",
      "Call out missing, stale, duplicated, or inconsistent records.",
      "Do not create a forecast or rank representatives unless the source contains comparable, current data and the user requests it."
    ],
    "outputs": [
      "Scope and data coverage",
      "Pipeline totals",
      "Stage and age analysis",
      "Data quality issues",
      "Actions"
    ]
  },
  {
    "key": "business_case",
    "title": "Sales business case",
    "summary": "Build a transparent customer business case with assumptions separated from verified inputs.",
    "steps": [
      "Start with the customer problem and outcomes they have stated.",
      "Use customer-provided or source-backed baseline metrics; label every assumption.",
      "Show calculation methods and ranges rather than presenting uncertain estimates as facts.",
      "Avoid guaranteed ROI, savings, revenue lift, or payback claims."
    ],
    "outputs": [
      "Problem and desired outcome",
      "Verified baseline",
      "Assumptions and calculations",
      "Risks",
      "Decision summary"
    ]
  },
  {
    "key": "partner_channel_research",
    "title": "Partner and referral research",
    "summary": "Identify plausible partner or referral routes using public, verifiable business evidence.",
    "steps": [
      "Define the target customer, geography, offer, and partner criteria first.",
      "Research organizations and programs using public sources; cite evidence of audience or service fit.",
      "Assess mutual value, conflicts, qualification effort, and likely introduction path.",
      "Do not claim a relationship, endorsement, or willingness to refer without direct evidence."
    ],
    "outputs": [
      "Partner shortlist",
      "Evidence of fit",
      "Mutual value",
      "Risks and qualification questions"
    ]
  },
  {
    "key": "sales_leadership_review",
    "title": "Sales leadership review",
    "summary": "Summarize sales execution and operating risks from a clearly bounded source set.",
    "steps": [
      "State the reporting period, source coverage, and metric definitions.",
      "Reconcile activity, pipeline, outcomes, and blockers against the supplied records.",
      "Separate observed performance from explanations or hypotheses.",
      "Recommend a small set of accountable actions; avoid unsupported individual rankings."
    ],
    "outputs": [
      "Executive summary",
      "Metric coverage",
      "Wins and blockers",
      "Risks",
      "Accountable actions"
    ]
  }
] as const;

export function listSalesWorkflows() {
  return SALES_WORKFLOWS.map(({ key, title, summary, outputs }) => ({ key, title, summary, outputs }));
}

export function getSalesWorkflow(key: string) {
  return SALES_WORKFLOWS.find((workflow) => workflow.key === key) ?? null;
}

export function buildSalesContext(connections: readonly { providerKey: string; connectionKind: string; status: string; capabilities: readonly string[] }[]) {
  const connectedSources = connections.map((connection) => ({
    provider: connection.providerKey,
    kind: connection.connectionKind,
    status: connection.status,
    capabilities: [...connection.capabilities],
  })).sort((a, b) => a.provider.localeCompare(b.provider));
  const crmProviders = connectedSources.filter((source) =>
    /salesforce|hubspot|pipedrive|zoho|dynamics|crm/i.test(source.provider)
    || source.capabilities.some((capability) => /(^|[._:-])crm($|[._:-])/i.test(capability))
  ).map((source) => source.provider);
  return {
    connectedSources,
    crm: { status: crmProviders.length ? 'connected' : 'not_connected', providers: crmProviders },
    workflows: listSalesWorkflows(),
    sourcePolicy: 'Use only data returned by tools available to this authenticated AgentSam session. This context tool lists connections; it does not read source records or grant new access.',
    writePolicy: 'This plugin has no CRM-write tools. Treat drafts and plans as proposals. Send messages, change records, or create tasks only through a separately authorized connector after explicit user approval.',
    evidencePolicy: 'Separate verified facts, user-provided context, hypotheses, and unknowns. Include source dates for material claims. Never invent contacts, deal values, pipeline totals, buying intent, or outcomes.',
  };
}
