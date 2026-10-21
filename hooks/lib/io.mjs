// @ts-check
import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Read all of stdin as UTF-8. Resolves to "" when stdin is a TTY or empty.
 * @returns {Promise<string>}
 */
export async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Parse hook input JSON. Returns null when the payload is missing or malformed.
 * @param {string} raw
 * @returns {Record<string, any> | null}
 */
export function parseHookInput(raw) {
  if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Walk up from `start` to the nearest directory holding a `.git` entry.
 * Falls back to `start` when no repository is found.
 * @param {string} start
 * @returns {string}
 */
export function findRepoRoot(start) {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

/**
 * True when `path` exists and is a regular file.
 * @param {string} path
 * @returns {boolean}
 */
export function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * True when the module at `moduleUrl` is the script node was asked to run.
 * @param {string} moduleUrl usually `import.meta.url`
 * @returns {boolean}
 */
export function isMainModule(moduleUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(realpathSync(entry)).href === moduleUrl;
  } catch {
    return false;
  }
}
