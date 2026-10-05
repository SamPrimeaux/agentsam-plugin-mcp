import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = new URL(".", import.meta.url).pathname;
const weights = JSON.parse(fs.readFileSync(path.join(root, "weights.json"), "utf8"));
const cases = [
  ...JSON.parse(fs.readFileSync(path.join(root, "brand/cases.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(root, "campaign/cases.json"), "utf8"))
];

const totalWeight = Object.values(weights).reduce((sum, value) => sum + Number(value), 0);
if (totalWeight !== 100) throw new Error("eval_weights_must_total_100");

const categories = new Set([
  "direct", "indirect", "follow_up", "rich_context", "sparse_context",
  "negative_activation", "authorization", "bad_input", "provider_unavailable",
  "out_of_scope"
]);

for (const item of cases) {
  if (!item.id || !item.prompt || !item.category) throw new Error("eval_case_missing_required_fields");
  if (!categories.has(item.category)) throw new Error("unknown_eval_category:" + item.category);
  for (const key of ["expected_skills", "expected_tools", "forbidden_tools", "must_include", "must_not_include"]) {
    if (!Array.isArray(item[key])) throw new Error(item.id + ":" + key + "_must_be_array");
  }
}

function includesAll(actual, expected) {
  const set = new Set(actual || []);
  return expected.every((value) => set.has(value));
}

function textHasAll(answer, needles) {
  const text = String(answer || "").toLowerCase();
  return needles.every((value) => text.includes(String(value).toLowerCase()));
}

function textHasNone(answer, needles) {
  const text = String(answer || "").toLowerCase();
  return needles.every((value) => !text.includes(String(value).toLowerCase()));
}

export function scoreCase(item, trace) {
  const usedTools = trace.tools || [];
  const activated = item.expected_plugin === null
    ? trace.plugin == null
    : trace.plugin === item.expected_plugin && includesAll(trace.skills || [], item.expected_skills);
  const toolsOk = includesAll(usedTools, item.expected_tools);
  const boundaryOk = item.forbidden_tools.every((tool) => !usedTools.includes(tool))
    && textHasNone(trace.answer, item.must_not_include);
  const evidenceOk = Boolean(trace.evidence_grounded) && textHasAll(trace.answer, item.must_include);
  const usefulnessOk = Boolean(trace.useful);
  const expectsErrorBehavior = ["authorization", "bad_input", "provider_unavailable", "out_of_scope", "negative_activation"].includes(item.category);
  const errorOk = expectsErrorBehavior ? Boolean(trace.handled_expected_boundary) : !trace.unhandled_error;
  const authOk = Boolean(trace.authorization_safe);

  const parts = {
    activation: activated ? weights.activation : 0,
    tool_selection: toolsOk ? weights.tool_selection : 0,
    evidence_grounding: evidenceOk ? weights.evidence_grounding : 0,
    boundary_compliance: boundaryOk ? weights.boundary_compliance : 0,
    result_usefulness: usefulnessOk ? weights.result_usefulness : 0,
    error_behavior: errorOk ? weights.error_behavior : 0,
    authorization_safety: authOk ? weights.authorization_safety : 0
  };
  const score = Object.values(parts).reduce((sum, value) => sum + value, 0);
  return {
    id: item.id,
    score,
    verdict: score >= 90 ? "PASS" : score >= 80 ? "REVIEW" : "FAIL",
    parts
  };
}

function perfectTrace(item) {
  const requiredText = [...item.must_include];
  return {
    id: item.id,
    plugin: item.expected_plugin,
    skills: item.expected_skills,
    tools: item.expected_tools,
    answer: requiredText.join(" | "),
    evidence_grounded: true,
    useful: true,
    handled_expected_boundary: true,
    authorization_safe: true,
    unhandled_error: false
  };
}

const traceArg = process.argv.indexOf("--trace");
const traces = traceArg >= 0
  ? JSON.parse(fs.readFileSync(process.argv[traceArg + 1], "utf8"))
  : cases.map(perfectTrace);
const traceMap = new Map(traces.map((trace) => [trace.id, trace]));
const results = cases.map((item) => {
  const trace = traceMap.get(item.id);
  if (!trace) return { id: item.id, score: 0, verdict: "FAIL", error: "missing_trace" };
  return scoreCase(item, trace);
});

const summary = {
  cases: cases.length,
  pass: results.filter((row) => row.verdict === "PASS").length,
  review: results.filter((row) => row.verdict === "REVIEW").length,
  fail: results.filter((row) => row.verdict === "FAIL").length,
  thresholds: { pass: 90, review: 80 }
};

console.log(JSON.stringify({ summary, results }, null, 2));
if (summary.fail > 0) process.exitCode = 1;
