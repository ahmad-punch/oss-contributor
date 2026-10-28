#!/usr/bin/env node
// @ts-check
// Lint for the plugin layout: manifests parse, hook scripts exist and are executable,
// every skill and command has valid frontmatter, and every command points at a real skill.
import { accessSync, constants, existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {string[]} */
const errors = [];

/** @param {string} file */
function readJson(file) {
  try {
    return JSON.parse(readFileSync(join(ROOT, file), "utf8"));
  } catch (error) {
    errors.push(`${file}: not valid JSON (${/** @type {Error} */ (error).message})`);
    return null;
  }
}

/**
 * Parse simple `key: value` frontmatter. Flags unquoted values containing ": ",
 * which YAML rejects.
 * @param {string} file
 * @returns {Record<string, string>}
 */
function frontmatter(file) {
  const text = readFileSync(join(ROOT, file), "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    errors.push(`${file}: missing --- frontmatter block at the top`);
    return {};
  }
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (!pair) continue;
    const [, key, raw] = pair;
    if (!/^["']/.test(raw) && raw.includes(": ")) {
      errors.push(`${file}: quote the value of "${key}", it contains ": "`);
    }
    fields[key] = raw.replace(/^(["'])(.*)\1$/, "$2");
  }
  return fields;
}

function checkManifests() {
  const plugin = readJson(".claude-plugin/plugin.json");
  const market = readJson(".claude-plugin/marketplace.json");
  const pkg = readJson("package.json");
  if (!plugin || !market || !pkg) return;
  if (!/^[a-z0-9-]+$/.test(plugin.name ?? "")) errors.push("plugin.json: name must be kebab-case");
  if (plugin.version !== pkg.version) errors.push(`plugin.json version ${plugin.version} differs from package.json ${pkg.version}`);
  const entry = market.plugins?.find((/** @type {{name: string}} */ p) => p.name === plugin.name);
  if (!entry) errors.push(`marketplace.json: no entry named "${plugin.name}"`);
}

function checkHooks() {
  const config = readJson("hooks/hooks.json");
  if (!config) return;
  for (const groups of Object.values(config.hooks ?? {})) {
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        for (const arg of hook.args ?? []) {
          const script = String(arg).replace("${CLAUDE_PLUGIN_ROOT}/", "");
          if (script === arg) continue;
          try {
            accessSync(join(ROOT, script), constants.X_OK);
          } catch {
            errors.push(`hooks.json: ${script} is missing or not executable (chmod +x ${script})`);
          }
        }
      }
    }
  }
}

function checkSkillsAndCommands() {
  const skills = readdirSync(join(ROOT, "skills"));
  for (const skill of skills) {
    const file = `skills/${skill}/SKILL.md`;
    if (!existsSync(join(ROOT, file))) {
      errors.push(`${file}: missing`);
      continue;
    }
    const fields = frontmatter(file);
    if (fields.name !== skill) errors.push(`${file}: name "${fields.name}" should be "${skill}"`);
    if (!fields.description) errors.push(`${file}: description is required`);
    for (const link of readFileSync(join(ROOT, file), "utf8").matchAll(/\]\((references\/[^)]+)\)/g)) {
      if (!existsSync(join(ROOT, "skills", skill, link[1]))) errors.push(`${file}: broken link ${link[1]}`);
    }
  }
  for (const command of readdirSync(join(ROOT, "commands"))) {
    const file = `commands/${command}`;
    const fields = frontmatter(file);
    if (!fields.description) errors.push(`${file}: description is required`);
    const body = readFileSync(join(ROOT, file), "utf8");
    const target = body.match(/oss-contributor:([\w-]+)/)?.[1];
    if (!target || !skills.includes(target)) errors.push(`${file}: does not reference an existing skill`);
    if (!body.includes("$ARGUMENTS")) errors.push(`${file}: does not pass $ARGUMENTS`);
  }
}

checkManifests();
checkHooks();
checkSkillsAndCommands();

if (errors.length > 0) {
  process.stderr.write(`Layout check failed:\n${errors.map((e) => `  - ${e}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("Layout check passed.\n");
