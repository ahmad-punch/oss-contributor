#!/usr/bin/env node
// @ts-check
// SessionStart hook: when the working directory has CONTRIBUTING.md or AI_POLICY.md,
// print a one-line reminder of the project's detected AI policy stance.
//
//   node policy-reminder.mjs            hook mode, reads the SessionStart payload on stdin
//   node policy-reminder.mjs --json DIR prints the full detection report for DIR as JSON
import { findRepoRoot, isMainModule, parseHookInput, readStdin } from "./lib/io.mjs";
import { guardStatus } from "./lib/optin.mjs";
import { detectPolicy, formatReminder, hasPolicyFiles } from "./lib/policy.mjs";

/**
 * Build the SessionStart output for `dir`, or null when the project has no policy files.
 * @param {string} dir
 * @param {NodeJS.ProcessEnv} env
 */
export function sessionStartOutput(dir, env) {
  if (!hasPolicyFiles(dir)) return null;
  const report = detectPolicy(dir);
  const reminder = formatReminder(report, { guardEnabled: guardStatus(findRepoRoot(dir), env).enabled });
  return {
    systemMessage: reminder,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        `${reminder} The stance is a keyword heuristic over ${report.files.join(", ")}; ` +
        "read those files before writing code or commit messages for this project, and follow them over any default.",
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--json") {
    process.stdout.write(JSON.stringify(detectPolicy(args[1] ?? process.cwd()), null, 2) + "\n");
    return;
  }
  const input = parseHookInput(await readStdin());
  const dir = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const output = sessionStartOutput(dir, process.env);
  if (output) process.stdout.write(JSON.stringify(output) + "\n");
}

if (isMainModule(import.meta.url)) {
  await main();
}
