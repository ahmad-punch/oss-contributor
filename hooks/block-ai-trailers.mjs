#!/usr/bin/env node
// @ts-check
// PreToolUse hook for Bash: blocks `git commit` when the message carries an AI
// co-author trailer or a "Generated with" line, in repositories that opted in.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot, isMainModule, parseHookInput, readStdin } from "./lib/io.mjs";
import { commitDirectory, commitMessageText, findAiTrailers, isGitCommit } from "./lib/trailers.mjs";

export const OPT_IN_FILE = ".no-ai-trailers";
export const OPT_IN_ENV = "OSS_NO_AI_TRAILERS";

/**
 * The guard runs when OSS_NO_AI_TRAILERS=1, or when the repo root holds .no-ai-trailers.
 * OSS_NO_AI_TRAILERS=0 switches it off even if the file exists.
 * @param {string} repoRoot
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ enabled: boolean, reason: string }}
 */
export function guardStatus(repoRoot, env) {
  const flag = env[OPT_IN_ENV];
  if (flag === "0") return { enabled: false, reason: `${OPT_IN_ENV}=0` };
  if (flag === "1") return { enabled: true, reason: `${OPT_IN_ENV}=1` };
  if (existsSync(join(repoRoot, OPT_IN_FILE))) {
    return { enabled: true, reason: `${OPT_IN_FILE} in ${repoRoot}` };
  }
  return { enabled: false, reason: "not opted in" };
}

/**
 * @param {string[]} lines
 * @param {string} reason
 * @returns {string}
 */
export function blockMessage(lines, reason) {
  return [
    `oss-contributor: commit blocked. This repository does not accept AI co-author or "Generated with" lines in commits (enabled by ${reason}).`,
    "Found:",
    ...lines.map((line) => `  - ${line}`),
    "Remove those lines from the commit message and run the commit again.",
    "If the project asks for AI disclosure, put it where its policy says (usually the PR description); run /oss-contributor:pr-prep to check.",
    `To turn this check off for this repo, delete ${OPT_IN_FILE} or set ${OPT_IN_ENV}=0.`,
  ].join("\n");
}

/**
 * Decide whether a PreToolUse payload should be blocked.
 * @param {Record<string, any> | null} input
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ block: false } | { block: true, message: string }}
 */
export function evaluate(input, env) {
  if (!input || input.tool_name !== "Bash") return { block: false };
  const command = input.tool_input?.command;
  if (typeof command !== "string" || !isGitCommit(command)) return { block: false };

  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const dir = commitDirectory(command, cwd);
  const status = guardStatus(findRepoRoot(dir), env);
  if (!status.enabled) return { block: false };

  const offending = findAiTrailers(commitMessageText(command, dir));
  if (offending.length === 0) return { block: false };
  return { block: true, message: blockMessage(offending, status.reason) };
}

async function main() {
  const result = evaluate(parseHookInput(await readStdin()), process.env);
  if (result.block) {
    process.stderr.write(result.message + "\n");
    process.exit(2);
  }
}

if (isMainModule(import.meta.url)) {
  await main();
}
