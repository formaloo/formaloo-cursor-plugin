#!/usr/bin/env node

// Checks this repository against the Cursor plugin submission checklist
// (https://cursor.com/docs/reference/plugins) for a single-plugin layout.
// Run with: node scripts/validate-plugin.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const variablePattern = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const expandedByCursor = new Set(["CURSOR_PLUGIN_ROOT", "CLAUDE_PLUGIN_ROOT"]);

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, label) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    errors.push(`${label} is missing: ${path.relative(repoRoot, filePath)}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    errors.push(`${label} contains invalid JSON: ${error.message}`);
    return null;
  }
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  if (path.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(extractPathValues);
  if (value && typeof value === "object") {
    return [value.path, value.file].filter((entry) => typeof entry === "string");
  }
  return [];
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  }
  return files;
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) return null;

  const fields = {};
  let currentKey = null;
  for (const line of normalized.slice(4, closingIndex).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1 || /^\s/.test(line)) {
      // Continuation of a wrapped multi-line value.
      if (currentKey) fields[currentKey] = `${fields[currentKey]} ${trimmed}`.trim();
      continue;
    }
    currentKey = line.slice(0, separator).trim();
    fields[currentKey] = line.slice(separator + 1).trim();
  }
  return fields;
}

async function validateManifest() {
  const manifestPath = path.join(repoRoot, ".cursor-plugin", "plugin.json");
  const manifest = await readJsonFile(manifestPath, "Plugin manifest");
  if (!manifest) return null;

  if (typeof manifest.name !== "string" || !pluginNamePattern.test(manifest.name)) {
    errors.push('"name" must be lowercase kebab-case using alphanumerics, hyphens, and periods.');
  }
  if (typeof manifest.description !== "string" || manifest.description.trim().length === 0) {
    errors.push('"description" is required for marketplace submission.');
  }
  if (manifest.version !== undefined && !/^\d+\.\d+\.\d+/.test(String(manifest.version))) {
    errors.push('"version" must be a semantic version, e.g. 1.0.0.');
  }
  if (!manifest.author || typeof manifest.author.name !== "string") {
    warnings.push('"author.name" is recommended.');
  }
  if (!manifest.logo) {
    warnings.push('"logo" is recommended; commit one and reference it by relative path.');
  }

  for (const field of ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"]) {
    for (const value of extractPathValues(manifest[field])) {
      if (!isSafeRelativePath(value)) {
        errors.push(`"${field}" path "${value}" must be relative, without ".." or an absolute prefix.`);
        continue;
      }
      if (value.startsWith("http")) continue;
      if (!(await pathExists(path.resolve(repoRoot, value)))) {
        errors.push(`"${field}" references a missing path: ${value}`);
      }
    }
  }

  return manifest;
}

function collectVariablePlaceholders(value, found) {
  if (typeof value === "string") {
    for (const match of value.matchAll(variablePattern)) found.add(match[1]);
    return found;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectVariablePlaceholders(entry, found);
    return found;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectVariablePlaceholders(entry, found);
  }
  return found;
}

async function validateMcpServers(manifest) {
  const mcpPath = path.join(repoRoot, "mcp.json");
  const inline = manifest?.mcpServers && typeof manifest.mcpServers === "object"
    ? manifest.mcpServers
    : null;

  if (!(await pathExists(mcpPath)) && !inline) {
    warnings.push("No mcp.json and no inline mcpServers (only needed when the plugin ships an MCP server).");
    return;
  }

  const config = inline ?? (await readJsonFile(mcpPath, "mcp.json"));
  if (!config) return;

  const servers = config.mcpServers ?? config;
  if (!servers || typeof servers !== "object" || Object.keys(servers).length === 0) {
    errors.push("mcp.json must define at least one entry under mcpServers.");
    return;
  }

  for (const [name, server] of Object.entries(servers)) {
    if (!server || typeof server !== "object") {
      errors.push(`mcp.json server "${name}" must be an object.`);
      continue;
    }
    if (!server.url && !server.command) {
      errors.push(`mcp.json server "${name}" needs either "url" or "command".`);
    }
    if (server.url && !/^https?:\/\//.test(server.url)) {
      errors.push(`mcp.json server "${name}" has a non-HTTP url: ${server.url}`);
    }
  }

  const declared = new Set(Object.keys(manifest?.variables?.properties ?? {}));
  for (const placeholder of collectVariablePlaceholders(servers, new Set())) {
    if (expandedByCursor.has(placeholder) || declared.has(placeholder)) continue;
    errors.push(
      `mcp.json uses \${${placeholder}} but it is not declared under "variables.properties" in plugin.json.`,
    );
  }

  const serialized = JSON.stringify(servers);
  if (/(api[_-]?key|secret|token)"\s*:\s*"(?!\$\{)[^"]{12,}/i.test(serialized)) {
    errors.push("mcp.json appears to contain a literal credential. Use a ${VAR} placeholder instead.");
  }
}

async function validateComponents() {
  const components = [
    { dir: "skills", label: "skill", match: (file) => path.basename(file) === "SKILL.md", keys: ["name", "description"] },
    { dir: "rules", label: "rule", match: (file) => /\.(md|mdc|markdown)$/i.test(file), keys: ["description"] },
    { dir: "agents", label: "agent", match: (file) => /\.(md|mdc|markdown)$/i.test(file), keys: ["name", "description"] },
    { dir: "commands", label: "command", match: (file) => /\.(md|mdc|markdown|txt)$/i.test(file), keys: ["name", "description"] },
  ];

  for (const { dir, label, match, keys } of components) {
    const componentDir = path.join(repoRoot, dir);
    if (!(await pathExists(componentDir))) continue;

    for (const file of await walkFiles(componentDir)) {
      if (!match(file)) continue;
      const relative = path.relative(repoRoot, file);
      const parsed = parseFrontmatter(await fs.readFile(file, "utf8"));
      if (!parsed) {
        errors.push(`${label} file is missing YAML frontmatter: ${relative}`);
        continue;
      }
      for (const key of keys) {
        if (!parsed[key]) errors.push(`${label} file is missing "${key}" in frontmatter: ${relative}`);
      }
      if (parsed.name && !pluginNamePattern.test(parsed.name)) {
        errors.push(`${label} "name" must be lowercase kebab-case: ${relative}`);
      }
    }
  }
}

async function validateReadme() {
  if (!(await pathExists(path.join(repoRoot, "README.md")))) {
    errors.push("README.md is required; it documents usage and configuration.");
  }
}

const manifest = await validateManifest();
await validateMcpServers(manifest);
await validateComponents();
await validateReadme();

if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log("");
}

if (errors.length > 0) {
  console.error("Validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Validation passed.");
