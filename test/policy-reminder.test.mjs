// @ts-check
import assert from "node:assert/strict";
import { cpSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { classifyLine, detectPolicy } from "../hooks/lib/policy.mjs";
import { FIXTURES, fixture, makeRepo, runHook } from "./helpers.mjs";

const SCRIPT = "policy-reminder.mjs";

/** Copy a policy fixture into a fresh repo so the hook sees a realistic root. */
function repoFrom(/** @type {string} */ name, /** @type {Record<string,string>} */ extra = {}) {
  const dir = makeRepo(extra);
  cpSync(join(FIXTURES, "policies", name), dir, { recursive: true });
  return dir;
}

/** @param {string} cwd @param {Record<string,string>} [env] */
function session(cwd, env) {
  const result = runHook(SCRIPT, fixture("sessionstart/startup", { cwd }), env);
  assert.equal(result.code, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout) : null;
}

describe("policy-reminder hook", () => {
  it("stays silent when there is no CONTRIBUTING.md or AI_POLICY.md", () => {
    assert.equal(session(makeRepo({ "README.md": "# x" })), null);
  });

  it("prints a one-line reminder for the user and context for Claude", () => {
    const out = session(repoFrom("ban"));
    assert.equal(out.systemMessage.split("\n").length, 1);
    assert.match(out.systemMessage, /BANNED/);
    assert.match(out.systemMessage, /CONTRIBUTING\.md:7/);
    assert.equal(out.hookSpecificOutput.hookEventName, "SessionStart");
    assert.match(out.hookSpecificOutput.additionalContext, /read those files/);
  });

  it("reports disclosure in the PR description and forbidden co-author trailers", () => {
    const out = session(repoFrom("disclose-pr"));
    assert.match(out.systemMessage, /DISCLOSURE \(in the PR description\)/);
    assert.match(out.systemMessage, /co-author trailers forbidden \(enable the commit guard: touch \.no-ai-trailers/);
  });

  it("notes when the commit guard is already on", () => {
    const out = session(repoFrom("disclose-pr", { ".no-ai-trailers": "" }));
    assert.match(out.systemMessage, /guard on/);
  });

  it("extracts the trailer format a project asks for", () => {
    const out = session(repoFrom("trailer"));
    assert.match(out.systemMessage, /trailer format "Assisted-by: TOOL \(MODEL\)"/);
  });

  it("distinguishes a ban on agents from a ban on AI", () => {
    assert.match(session(repoFrom("no-agents")).systemMessage, /autonomous AI agents/);
  });

  it("does not invent rules for neutral or silent policies", () => {
    assert.match(session(repoFrom("neutral")).systemMessage, /no explicit rule/);
    assert.match(session(repoFrom("silent")).systemMessage, /no AI rule found; checked CONTRIBUTING\.md/);
  });

  it("falls back to the process cwd when stdin is empty", () => {
    assert.equal(runHook(SCRIPT, "").code, 0);
  });
});

describe("policy detection", () => {
  it("classifies representative sentences", () => {
    assert.equal(classifyLine("It is expressly forbidden to contribute content created with AI tools."), "ban");
    assert.equal(classifyLine("PRs that use AI without disclosure will be closed."), "disclose");
    assert.equal(classifyLine("Unsupervised AI agents are not permitted."), "no-agents");
    assert.equal(classifyLine("Run the linter before pushing."), "silent");
  });

  it("returns a structured report for skills to consume", () => {
    const report = detectPolicy(join(FIXTURES, "policies", "trailer"));
    assert.deepEqual(report.files, ["CONTRIBUTING.md"]);
    assert.equal(report.stance, "disclose");
    assert.equal(report.disclosureWhere, "commit-trailer");
    assert.equal(report.forbidsAiCoAuthor, true);
  });
});
