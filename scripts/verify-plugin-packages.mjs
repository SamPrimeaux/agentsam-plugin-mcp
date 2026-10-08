import fs from "node:fs";
import path from "node:path";

const roots = [
  path.resolve("plugins/agentsam-brand"),
  path.resolve("plugins/agentsam-campaign")
];

const requiredInterface = [
  "displayName",
  "shortDescription",
  "longDescription",
  "developerName",
  "category",
  "capabilities",
  "websiteURL",
  "supportURL",
  "privacyPolicyURL",
  "termsOfServiceURL",
  "composerIcon",
  "logo"
];

function fail(message) {
  console.error("plugin-package: " + message);
  process.exitCode = 1;
}

function oneLine(value) {
  return typeof value === "string" && !/[\r\n]/.test(value);
}

function fileExists(root, rel) {
  if (typeof rel !== "string" || !rel.startsWith("./") || rel.includes("..")) return false;
  return fs.existsSync(path.resolve(root, rel.slice(2)));
}

function pngSize(file) {
  const data = fs.readFileSync(file);
  if (data.length < 24 || data.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

for (const root of roots) {
  const manifestPath = path.join(root, "plugin.json");
  const mcpPath = path.join(root, "mcp.json");
  const productPath = path.join(root, "agentsam.product.json");
  const qualityPath = path.join(root, "agentsam.quality.json");
  if (!fs.existsSync(manifestPath)) {
    fail(path.basename(root) + ": missing plugin.json");
    continue;
  }
  if (!fs.existsSync(mcpPath)) {
    fail(path.basename(root) + ": missing mcp.json");
    continue;
  }
  if (!fs.existsSync(productPath)) {
    fail(path.basename(root) + ": missing agentsam.product.json");
    continue;
  }
  if (!fs.existsSync(qualityPath)) {
    fail(path.basename(root) + ": missing agentsam.quality.json");
    continue;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const mcp = JSON.parse(fs.readFileSync(mcpPath, "utf8"));
  const product = JSON.parse(fs.readFileSync(productPath, "utf8"));
  const quality = JSON.parse(fs.readFileSync(qualityPath, "utf8"));
  const ext = manifest.extensions?.["com.openai"];
  const ui = ext?.interface;
  const review = ext?.review;

  if (product.schema !== "agentsam.plugin-product/v1") fail(manifest.name + ": wrong AgentSam product schema");
  if (product.identity?.id !== manifest.name) fail(manifest.name + ": product identity must match plugin name");
  if (product.identity?.version !== manifest.version) fail(manifest.name + ": product version must match plugin version");
  if (!product.ownership?.domainPackage?.startsWith("@inneranimalmedia/")) fail(manifest.name + ": missing canonical domain package");
  if (JSON.stringify(product.lifecycle?.states) !== JSON.stringify(["available","installed","needs_connection","connected","ready"])) {
    fail(manifest.name + ": lifecycle must use canonical AgentSam states");
  }
  if (product.ready != null || product.connected != null || product.toolCount != null) {
    fail(manifest.name + ": product definition must not persist runtime truth");
  }
  if (quality.schema !== "agentsam.plugin-quality-evidence/v1") fail(manifest.name + ": wrong quality evidence schema");
  if (quality.pluginId !== manifest.name) fail(manifest.name + ": quality evidence pluginId mismatch");
  const requiredChecks = product.verification?.requiredChecks || [];
  if (!Array.isArray(requiredChecks) || requiredChecks.length < 1) fail(manifest.name + ": verification.requiredChecks required");
  for (const id of requiredChecks) {
    const status = quality.checks?.[id]?.status;
    if (!["pass","fail","unverified","not_applicable"].includes(status)) fail(manifest.name + ": missing/invalid quality evidence for " + id);
  }
  if (product.release?.receiptRequired !== true) fail(manifest.name + ": quality receipt must be required");

  if (manifest.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") fail(manifest.name + ": wrong plugin schema");
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(manifest.name || "") || String(manifest.name).length > 64) fail(manifest.name + ": invalid package name");
  if (!/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(manifest.version || "")) fail(manifest.name + ": invalid semver");
  if (!ui || typeof ui !== "object") fail(manifest.name + ": missing OpenAI interface");

  for (const field of requiredInterface) {
    if (ui?.[field] == null || ui[field] === "") fail(manifest.name + ": missing interface." + field);
  }

  if (!oneLine(ui?.displayName) || ui.displayName.length > 30) fail(manifest.name + ": displayName exceeds final limit");
  if (!oneLine(ui?.shortDescription) || ui.shortDescription.length > 30) fail(manifest.name + ": shortDescription exceeds final limit");
  if (typeof ui?.longDescription !== "string" || ui.longDescription.length > 4000) fail(manifest.name + ": longDescription invalid");
  if (!oneLine(ui?.developerName) || ui.developerName.length > 80) fail(manifest.name + ": developerName invalid");
  if (!Array.isArray(ui?.capabilities) || ui.capabilities.length > 20 || ui.capabilities.some((x) => !oneLine(x) || !x || x.length > 120)) fail(manifest.name + ": capabilities invalid");
  if (Array.isArray(ui?.defaultPrompt) && (ui.defaultPrompt.length > 3 || ui.defaultPrompt.some((x) => !oneLine(x) || !x || x.length > 128))) fail(manifest.name + ": defaultPrompt invalid");

  for (const key of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    try {
      const url = new URL(ui[key]);
      if (url.protocol !== "https:" || ui[key].length > 1024) throw new Error();
    } catch {
      fail(manifest.name + ": invalid " + key);
    }
  }

  for (const key of ["composerIcon", "logo"]) {
    if (!fileExists(root, ui[key])) {
      fail(manifest.name + ": missing " + key + " asset");
      continue;
    }
    if (ui[key].endsWith(".png")) {
      const size = pngSize(path.resolve(root, ui[key].slice(2)));
      if (!size || size.width !== size.height || size.width < 48 || size.width > 4096) {
        fail(manifest.name + ": " + key + " must be square 48-4096px");
      }
    }
  }

  const serverEntries = Object.entries(mcp.mcpServers || {});
  if (mcp.$schema !== "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json") fail(manifest.name + ": wrong MCP schema");
  if (serverEntries.length !== 1) fail(manifest.name + ": initial review package must declare exactly one MCP server");
  for (const [, server] of serverEntries) {
    if (server.type !== "streamable-http") fail(manifest.name + ": MCP server type must be streamable-http");
    try {
      const url = new URL(server.url);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      fail(manifest.name + ": invalid MCP URL");
    }
  }

  const positive = review?.test_cases?.positive;
  const negative = review?.test_cases?.negative;
  if (!Array.isArray(positive) || positive.length !== 5) fail(manifest.name + ": review must have exactly 5 positive cases");
  if (!Array.isArray(negative) || negative.length !== 3) fail(manifest.name + ": review must have exactly 3 negative cases");
  for (const row of positive || []) {
    if (!row.description || !row.prompt || !row.tools_triggered || !row.expected_behavior) fail(manifest.name + ": incomplete positive review case");
  }
  for (const row of negative || []) {
    if (!row.description || !row.prompt) fail(manifest.name + ": incomplete negative review case");
  }

  if (!fileExists(root, ext?.onboardingSkill)) fail(manifest.name + ": onboardingSkill does not resolve");

  const skillRoot = path.join(root, "skills");
  for (const entry of fs.readdirSync(skillRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillRoot, entry.name, "SKILL.md");
    if (!fs.existsSync(skillPath)) fail(manifest.name + ": missing SKILL.md for " + entry.name);
    if ((manifest.name + ":" + entry.name).length > 64) fail(manifest.name + ": combined skill identity too long: " + entry.name);
  }

  console.log(manifest.name + ": package checks complete");
}

if (process.exitCode) process.exit(process.exitCode);
