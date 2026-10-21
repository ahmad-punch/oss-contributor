// @ts-check
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { isFile } from "./io.mjs";

/** Names and addresses that identify an AI tool or bot rather than a person. */
const AI_IDENTITY =
  /\b(claude|anthropic|copilot|chatgpt|openai|gpt-?\d[\w.-]*|codex|gemini|bard|cursor\s?agent|codeium|windsurf|aider|tabnine|codewhisperer|amazon q)\b|\[bot\]|[-_.]bot\b|\bbot@|noreply@(anthropic\.com|openai\.com|aider\.chat)/i;

/** A trailer line starts a line, follows a literal "\n" in a one-line -m, or opens a quoted message. */
const LINE_START = String.raw`(?:^|\\n|["'])[ \t]*`;
const STOP = String.raw`[^\n\r"'\\` + "`" + String.raw`]*`;
const CO_AUTHOR = new RegExp(`${LINE_START}(co-authored-by:${STOP})`, "gim");
const GENERATED_WITH = new RegExp(`${LINE_START}((?:\\u{1F916}[ \\t]*)?generated with\\b${STOP})`, "gimu");

/** `git [global options] commit`, including `git -C dir commit` and `git -c k=v commit`. */
const GIT_COMMIT = /\bgit(?:\s+(?:-C\s+\S+|-c\s+\S+|--[\w-]+(?:=\S+)?))*\s+commit(?![\w-])/;
const GIT_DASH_C = /\bgit\s+(?:[^|;&]*?\s)?-C\s+("[^"]+"|'[^']+'|\S+)/;
const LEADING_CD = /^\s*cd\s+("[^"]+"|'[^']+'|\S+)\s*&&/;
const MESSAGE_FILE = /\s(?:-F\s*|--file[=\s]+)("[^"]+"|'[^']+'|[^\s;&|]+)/g;

const MAX_MESSAGE_FILE_BYTES = 1024 * 1024;

/**
 * @param {string} token
 * @returns {string}
 */
function unquote(token) {
  return token.replace(/^(["'])(.*)\1$/, "$2");
}

/**
 * True when the shell command runs `git commit`.
 * @param {string} command
 * @returns {boolean}
 */
export function isGitCommit(command) {
  return GIT_COMMIT.test(command);
}

/**
 * Directory the commit runs in: honours `git -C <dir>` and a leading `cd <dir> &&`.
 * @param {string} command
 * @param {string} cwd
 * @returns {string}
 */
export function commitDirectory(command, cwd) {
  const match = command.match(GIT_DASH_C) ?? command.match(LEADING_CD);
  if (!match) return cwd;
  const target = unquote(match[1]);
  return isAbsolute(target) ? target : resolve(cwd, target);
}

/**
 * Text to inspect: the command itself (covers -m and heredocs) plus any -F/--file message files.
 * @param {string} command
 * @param {string} dir
 * @returns {string}
 */
export function commitMessageText(command, dir) {
  const parts = [command];
  for (const match of command.matchAll(MESSAGE_FILE)) {
    const name = unquote(match[1]);
    if (name === "-") continue;
    const path = isAbsolute(name) ? name : resolve(dir, name);
    if (isFile(path)) {
      parts.push(readFileSync(path, "utf8").slice(0, MAX_MESSAGE_FILE_BYTES));
    }
  }
  return parts.join("\n");
}

/**
 * Find AI co-author trailers and "Generated with" lines in a commit message.
 * Human co-authors are left alone.
 * @param {string} text
 * @returns {string[]} offending lines, trimmed
 */
export function findAiTrailers(text) {
  const found = [];
  for (const match of text.matchAll(CO_AUTHOR)) {
    const line = match[1].trim();
    if (AI_IDENTITY.test(line.slice("co-authored-by:".length))) found.push(line);
  }
  for (const match of text.matchAll(GENERATED_WITH)) {
    found.push(match[1].trim());
  }
  return [...new Set(found)];
}
