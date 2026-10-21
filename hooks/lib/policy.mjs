// @ts-check
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isFile } from "./io.mjs";

/** Files that, when present, mean the project has written contribution rules. */
export const TRIGGER_FILES = [
  "AI_POLICY.md",
  ".github/AI_POLICY.md",
  "CONTRIBUTING.md",
  ".github/CONTRIBUTING.md",
  "docs/CONTRIBUTING.md",
  "CONTRIBUTING.rst",
];

/** Files read for policy language, in priority order. */
export const POLICY_FILES = [
  "AI_POLICY.md",
  ".github/AI_POLICY.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  ".github/CONTRIBUTING.md",
  "docs/CONTRIBUTING.md",
  "CONTRIBUTING.rst",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/pull_request_template.md",
];

const MAX_BYTES = 256 * 1024;

const AI_TERM =
  /(\bAI\b|\bA\.I\.|artificial intelligence|\bLLMs?\b|language models?|generative|\bgen-?AI\b|copilot|chatgpt|\bclaude\b|coding (?:assistant|agent)s?|code assistants?|agentic|machine[- ]generated)/i;
const REFUSAL =
  /(forbid(?:den|s)?|prohibit(?:ed|s)?|\bban(?:ned|s)?\b|not (?:be )?(?:accepted|allowed|permitted|welcome)|(?:do(?:es)?|will|can)\s?not accept|(?:don't|won't|can't) accept|\bdecline[sd]?\b|\brefuse[sd]?\b|will be (?:closed|rejected|discarded)|no value|presumed to be tainted|don't open a (?:PR|pull request)|do not open a (?:PR|pull request))/i;
const CONDITIONAL = /(disclos|without|unless|undisclosed|autonomous|unsupervised|slop|low[- ]quality|good first|unreviewed|untested|verbatim)/i;
const AUTONOMOUS = /(autonomous|unsupervised|fully[- ]automated|agentic|AI agents?|bots?\b)/i;
const DISCLOSE = /(disclos|assisted-by:|generated-by:|must (?:state|mention|note)|let (?:us|reviewers) know)/i;
const CO_AUTHOR = /co-?author/i;
const NEGATION = /(\bnot\b|\bnever\b|\bno\b|forbid|don't|do not|must not|avoid|instead of)/i;
const ASSISTED_BY = /\b(Assisted-by|Generated-by):\s*([^\n`"]{0,60})/i;

/**
 * @typedef {"ban" | "no-agents" | "disclose" | "mentions-ai" | "silent"} Stance
 * @typedef {{ file: string, line: number, text: string }} Evidence
 * @typedef {{
 *   files: string[],
 *   stance: Stance,
 *   evidence: Evidence | null,
 *   disclosureWhere: "pr-description" | "commit-trailer" | "unspecified" | null,
 *   trailerFormat: string | null,
 *   forbidsAiCoAuthor: boolean,
 * }} PolicyReport
 */

/** @type {Record<Stance, number>} */
const RANK = { ban: 4, "no-agents": 3, disclose: 2, "mentions-ai": 1, silent: 0 };

/**
 * Classify a single line of policy text.
 * @param {string} line
 * @returns {Stance}
 */
export function classifyLine(line) {
  const aiLine = AI_TERM.test(line);
  if (aiLine && REFUSAL.test(line)) {
    if (AUTONOMOUS.test(line)) return "no-agents";
    if (!CONDITIONAL.test(line)) return "ban";
  }
  if (DISCLOSE.test(line) && (aiLine || /assist|tool/i.test(line))) return "disclose";
  if (aiLine) return "mentions-ai";
  return "silent";
}

/**
 * Where a disclosure line says the disclosure belongs.
 * @param {string} line
 * @returns {"pr-description" | "commit-trailer" | "unspecified"}
 */
function disclosureLocation(line) {
  if (/(pull request|\bPR\b)(?: description| body| template)?|description/i.test(line)) return "pr-description";
  if (/(commit message|trailer|assisted-by:|generated-by:)/i.test(line)) return "commit-trailer";
  return "unspecified";
}

/**
 * Read the policy files in `dir` and summarise the project's AI stance.
 * Heuristic: it reports the strongest rule it can find, with the line that triggered it.
 * @param {string} dir
 * @returns {PolicyReport}
 */
export function detectPolicy(dir) {
  /** @type {PolicyReport} */
  const report = {
    files: [],
    stance: "silent",
    evidence: null,
    disclosureWhere: null,
    trailerFormat: null,
    forbidsAiCoAuthor: false,
  };

  for (const file of POLICY_FILES) {
    const path = join(dir, file);
    if (!isFile(path)) continue;
    report.files.push(file);
    const lines = readFileSync(path, "utf8").slice(0, MAX_BYTES).split(/\r?\n/);

    lines.forEach((text, index) => {
      const stance = classifyLine(text);
      if (RANK[stance] > RANK[report.stance]) {
        report.stance = stance;
        report.evidence = { file, line: index + 1, text: text.trim() };
      }
      if (stance === "disclose" && report.disclosureWhere !== "pr-description") {
        report.disclosureWhere = disclosureLocation(text);
      }
      const trailer = text.match(ASSISTED_BY);
      if (trailer && !report.trailerFormat) report.trailerFormat = `${trailer[1]}: ${trailer[2].trim()}`.trim();
      if (CO_AUTHOR.test(text) && NEGATION.test(text) && (AI_TERM.test(text) || /trailer/i.test(text))) {
        report.forbidsAiCoAuthor = true;
      }
    });
  }
  return report;
}

/**
 * True when `dir` contains a CONTRIBUTING or AI_POLICY file.
 * @param {string} dir
 * @returns {boolean}
 */
export function hasPolicyFiles(dir) {
  return TRIGGER_FILES.some((file) => isFile(join(dir, file)));
}

const STANCE_TEXT = {
  ban: "AI-generated contributions appear to be BANNED",
  "no-agents": "autonomous AI agents appear to be NOT allowed (human-driven use may be fine)",
  disclose: "AI use appears to require DISCLOSURE",
  "mentions-ai": "AI tooling is mentioned but no explicit rule was detected",
  silent: "no AI rule found",
};

/**
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function clip(text, max) {
  const flat = text.replace(/\s+/g, " ").replace(/^[#>*\-\s]+/, "");
  return flat.length > max ? `${flat.slice(0, max - 3)}...` : flat;
}

/**
 * One-line reminder for the start of a session.
 * @param {PolicyReport} report
 * @param {{ guardEnabled: boolean }} options
 * @returns {string}
 */
export function formatReminder(report, { guardEnabled }) {
  const parts = [`oss-contributor: ${STANCE_TEXT[report.stance]}`];
  if (report.stance === "disclose" && report.disclosureWhere && report.disclosureWhere !== "unspecified") {
    parts[0] += report.disclosureWhere === "pr-description" ? " (in the PR description)" : " (as a commit trailer)";
  }
  if (report.trailerFormat) parts.push(`trailer format "${clip(report.trailerFormat, 50)}"`);
  if (report.forbidsAiCoAuthor) {
    parts.push(guardEnabled ? "AI co-author trailers forbidden (guard on)" : "AI co-author trailers forbidden (enable the commit guard: touch .no-ai-trailers && echo .no-ai-trailers >> .git/info/exclude)");
  }
  if (report.evidence) {
    parts.push(`see ${report.evidence.file}:${report.evidence.line} "${clip(report.evidence.text, 90)}"`);
  } else {
    parts.push(`checked ${report.files.join(", ")}`);
  }
  return `${parts.join("; ")}. Run /oss-contributor:pr-prep before opening a PR.`;
}
