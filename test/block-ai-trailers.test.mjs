// @ts-check
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { findAiTrailers, isGitCommit } from "../hooks/lib/trailers.mjs";
import { fixture, makeRepo, runHook } from "./helpers.mjs";

const SCRIPT = "block-ai-trailers.mjs";

/** @param {string} name @param {string} cwd */
const commit = (name, cwd) => fixture(`pretooluse/${name}`, { cwd });

describe("block-ai-trailers hook", () => {
  const optedIn = makeRepo({ ".no-ai-trailers": "" });
  const plain = makeRepo();

  for (const name of ["commit-claude-heredoc", "commit-copilot-oneline", "commit-bot-coauthor"]) {
    it(`blocks ${name} when .no-ai-trailers exists`, () => {
      const result = runHook(SCRIPT, commit(name, optedIn));
      assert.equal(result.code, 2);
      assert.match(result.stderr, /commit blocked/);
      assert.match(result.stderr, /Remove those lines/);
    });
  }

  for (const name of ["commit-human-coauthor", "commit-assisted-by", "commit-clean", "not-a-commit"]) {
    it(`allows ${name}`, () => {
      const result = runHook(SCRIPT, commit(name, optedIn));
      assert.equal(result.code, 0);
      assert.equal(result.stderr, "");
    });
  }

  it("lists both the co-author trailer and the Generated with line", () => {
    const { stderr } = runHook(SCRIPT, commit("commit-claude-heredoc", optedIn));
    assert.match(stderr, /Co-Authored-By: Claude Opus 4\.7 <noreply@anthropic\.com>/);
    assert.match(stderr, /Generated with \[Claude Code\]/);
  });

  it("does nothing in a repo that has not opted in", () => {
    assert.equal(runHook(SCRIPT, commit("commit-claude-heredoc", plain)).code, 0);
  });

  it("opts in through OSS_NO_AI_TRAILERS=1", () => {
    const result = runHook(SCRIPT, commit("commit-claude-heredoc", plain), { OSS_NO_AI_TRAILERS: "1" });
    assert.equal(result.code, 2);
    assert.match(result.stderr, /OSS_NO_AI_TRAILERS=1/);
  });

  it("opts out through OSS_NO_AI_TRAILERS=0 even when the file exists", () => {
    const result = runHook(SCRIPT, commit("commit-claude-heredoc", optedIn), { OSS_NO_AI_TRAILERS: "0" });
    assert.equal(result.code, 0);
  });

  it("finds the opt-in file from a subdirectory", () => {
    const result = runHook(SCRIPT, commit("commit-copilot-oneline", join(optedIn, "src", "deep")));
    assert.equal(result.code, 2);
  });

  it("follows git -C to the target repository", () => {
    const input = fixture("pretooluse/commit-clean", {
      cwd: plain,
      tool_input: { command: `git -C ${optedIn} commit -m "Fix" -m "Co-Authored-By: Claude <noreply@anthropic.com>"` },
    });
    assert.equal(runHook(SCRIPT, input).code, 2);
  });

  it("reads messages passed with -F", () => {
    writeFileSync(join(optedIn, "MSG.txt"), "Fix parser\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n");
    const input = fixture("pretooluse/commit-clean", { cwd: optedIn, tool_input: { command: "git commit -F MSG.txt" } });
    assert.equal(runHook(SCRIPT, input).code, 2);
  });

  it("ignores other tools and malformed input", () => {
    assert.equal(runHook(SCRIPT, { tool_name: "Edit", tool_input: {} }).code, 0);
    assert.equal(runHook(SCRIPT, "not json").code, 0);
    assert.equal(runHook(SCRIPT, "").code, 0);
  });
});

describe("trailer detection", () => {
  it("recognises git commit forms", () => {
    assert.ok(isGitCommit("git commit -m x"));
    assert.ok(isGitCommit("git -c user.name=x commit --amend"));
    assert.ok(isGitCommit("npm test && git commit -am x"));
    assert.ok(!isGitCommit("git commit-tree HEAD^{tree}"));
    assert.ok(!isGitCommit("git log --oneline"));
  });

  it("flags AI and bot identities but not people", () => {
    assert.deepEqual(findAiTrailers("x\n\nCo-authored-by: Jane Doe <jane@example.org>"), []);
    assert.equal(findAiTrailers("x\n\nCo-authored-by: Cursor Agent <cursoragent@cursor.com>").length, 1);
    assert.equal(findAiTrailers("x\n\nCo-authored-by: aider (gpt-5) <noreply@aider.chat>").length, 1);
    assert.equal(findAiTrailers("x\n\nCo-Authored-By: ChatGPT <noreply@openai.com>").length, 1);
  });

  it("does not treat sanctioned disclosure trailers as violations", () => {
    assert.deepEqual(findAiTrailers("x\n\nAssisted-by: Claude Code (Claude Opus 4.7)\nGenerated-by: Copilot"), []);
  });
});
