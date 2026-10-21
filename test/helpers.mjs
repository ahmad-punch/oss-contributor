// @ts-check
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES = join(ROOT, "test", "fixtures");

/**
 * Create a throwaway directory that looks like a git repository root.
 * @param {Record<string, string>} [files] relative path -> contents
 * @returns {string}
 */
export function makeRepo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "oss-contributor-"));
  mkdirSync(join(dir, ".git"));
  for (const [name, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), contents);
  }
  return dir;
}

/**
 * Load a JSON fixture and override fields.
 * @param {string} name path under test/fixtures, without .json
 * @param {Record<string, unknown>} overrides
 */
export function fixture(name, overrides = {}) {
  const base = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8"));
  return { ...base, ...overrides };
}

/**
 * Run a hook script the way Claude Code does: JSON on stdin, exit code and streams back.
 * @param {string} script path under hooks/
 * @param {unknown} input
 * @param {Record<string, string>} [env]
 */
export function runHook(script, input, env = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.OSS_NO_AI_TRAILERS;
  const result = spawnSync(process.execPath, [join(ROOT, "hooks", script)], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    env: { ...baseEnv, ...env },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}
