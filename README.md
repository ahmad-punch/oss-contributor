# oss-contributor

A Claude Code plugin for contributing to open source projects the way their maintainers ask: policy-aware PR prep, minimal repros, repo scouting, review replies, and a guard against AI co-author trailers.

[![CI](https://github.com/ahmad-punch/oss-contributor/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmad-punch/oss-contributor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](package.json)

```text
$ claude
oss-contributor: AI use appears to require DISCLOSURE (in the PR description); AI co-author trailers
forbidden (guard on); see CONTRIBUTING.md:7 "You may use AI tools, but you must disclose it in the
pull request description, for exa...". Run /oss-contributor:pr-prep before opening a PR.

> commit the fix
  Bash(git commit -m "...Co-Authored-By: Claude ... Generated with [Claude Code]...")
  PreToolUse:Bash hook blocked the command:
  oss-contributor: commit blocked. This repository does not accept AI co-author or "Generated with"
  lines in commits (enabled by .no-ai-trailers in /home/me/src/widgets).
  Found:
    - Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
    - 🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Remove those lines from the commit message and run the commit again.
```

## Why

More projects now publish rules for AI-assisted contributions. Kubernetes wants a sentence in the PR description and forbids AI trailers. The Linux kernel and Mesa want an `Assisted-by:` trailer. LLVM keeps `good first issue` for people learning the codebase. Some projects refuse AI-generated code outright. Claude Code's defaults (a `Co-Authored-By: Claude` trailer, a "Generated with" line) break several of these rules, and maintainers close PRs that look generated without reading them.

This plugin reads each project's own rules before you write or submit anything, keeps the human author in charge of the words that reach maintainers, and stops the commit trailers a project forbids.

## Install

Requires Claude Code and Node.js 18 or newer. The `gh` CLI, signed in, is needed for `/scout`, `/repro`, `/review-reply`, and the issue lookups in `/pr-prep`.

```text
/plugin marketplace add ahmad-punch/oss-contributor
/plugin install oss-contributor@ahmad-punch
```

From a local checkout:

```bash
git clone https://github.com/ahmad-punch/oss-contributor
claude --plugin-dir ./oss-contributor
```

## Usage

The examples below are abridged sessions against a made-up `acme/widgets` repository.

### `/oss-contributor:scout <owner/repo>`

Go or no-go before you pick a project or an issue. Reads `pull_request_creation_policy`, the outsider merge rate over six months (closed PRs from forks by non-members, via GraphQL `isCrossRepository`), good first issue staleness, and the policy files. If the `contrib-scout` tool is installed it uses that for the numbers.

```text
> /oss-contributor:scout acme/widgets

## Scout: acme/widgets
Verdict: CAUTION
PR creation policy: all
Activity: last push 2026-10-26
Outsider merge rate (6 months): 9/31 (29%)
Unanswered outsider PRs: 14 of 22
Good first issues: 2 available, 5 stale, 3 claimed
AI policy: disclose (CONTRIBUTING.md: "Disclose AI assistance in the PR description.")
Gates: DCO sign-off, issue assignment before work
Best candidates: #812 Off-by-one in cursor pagination (confirmed by a maintainer, unassigned)
```

### `/oss-contributor:repro <issue>`

Turns a bug report into one minimal failing test in the project's own style, runs only that test, and reports. It does not write the fix, and it tells you to post the repro and wait if no maintainer has acknowledged the bug.

```text
> /oss-contributor:repro acme/widgets#812

## Repro: acme/widgets#812 "Last item skipped when page size divides total"
Status: reproduced
Test: test/pagination.test.ts > "returns the final item when total is a multiple of limit"
Command: pnpm vitest run test/pagination.test.ts -t "final item"
Result: expected [ 9, 10 ] to deeply equal [ 9, 10, 11 ]
Cause (if found): src/cursor.ts:41, `<` should be `<=` when computing hasMore
Maintainer acknowledged: yes (@maintainer, 2026-10-20)
Next step: ask to be assigned, then fix
```

### `/oss-contributor:pr-prep [issue]`

Reads CONTRIBUTING, AI_POLICY, AGENTS.md, the PR template, CODEOWNERS, CI and the issue; prints a compliance checklist; self-checks the diff against a list of slop tells; then drafts a title and description in your voice, with a disclosure line only where the project requires one, worded the way it asks.

```text
> /oss-contributor:pr-prep 812

## Compliance checklist: acme/widgets for #812
Policy stance: disclosure required (CONTRIBUTING.md:7 "you must disclose it in the pull request description")
Disclosure: required
  Wording: "This PR was written in part with the assistance of generative AI"
  Where: PR description
Trailers:
  [x] no AI Co-authored-by or Generated with lines on the branch
  [ ] Signed-off-by on every commit (DCO check in .github/workflows/dco.yml)
Gates:
  [x] #812 assigned to you
Before pushing, run:
  [x] pnpm test (from .github/workflows/ci.yml), passed in this session
  [ ] pnpm lint (from .github/workflows/ci.yml)
Reviewers (CODEOWNERS): @acme/core for src/cursor.ts
Diff: 2 files, +14/-1 lines
Slop tells: none found

Draft (edit this into your own words before submitting):
  cursor: include the last item when total is a multiple of limit
  ...
```

### `/oss-contributor:review-reply [PR]`

Collects unresolved review threads, makes the requested code changes, runs the affected tests, and gives you short notes per thread. You write and post the replies; it never posts, resolves threads, or produces paragraphs to paste.

```text
> /oss-contributor:review-reply 815

### src/cursor.ts:41 (@maintainer)
Asked: handle limit = 0 instead of returning hasMore = true forever
Done: early return for limit <= 0 at src/cursor.ts:36; new test in test/pagination.test.ts:88
Points for your reply: limit 0 now returns an empty page; covered by the new test; pnpm test passes
```

## Hooks

### Commit trailer guard (PreToolUse on Bash)

Inspects `git commit` commands Claude runs, including `-m`, heredoc messages, `-F <file>`, `git -C <dir>` and `cd <dir> &&`. If the message has a `Co-Authored-By:` naming an AI tool or bot, or a "Generated with" line, it exits with code 2 and tells Claude which lines to remove. Human co-authors and `Assisted-by:` trailers pass through, since some projects require the latter.

It is off by default. Turn it on per repository or globally:

```bash
# per repo, without committing the marker file
touch .no-ai-trailers && echo .no-ai-trailers >> .git/info/exclude

# everywhere, for this shell or in your Claude Code settings env
export OSS_NO_AI_TRAILERS=1

# off, even where .no-ai-trailers exists
export OSS_NO_AI_TRAILERS=0
```

To stop Claude Code adding the trailer in the first place, also set `"attribution": {"commit": "", "pr": ""}` in your settings (`"includeCoAuthoredBy": false` on older versions); the guard catches the cases that slip through.

### Policy reminder (SessionStart)

When the working directory has `CONTRIBUTING.md` or `AI_POLICY.md`, it reads those plus `AGENTS.md` and the PR template, classifies the stance (banned, agents not allowed, disclosure required, mentions AI, silent), and prints one line with the sentence it matched. The same line goes to Claude as context. It prints nothing in projects without those files. The classification is a keyword heuristic, so it points you at the right line rather than deciding for you; `/pr-prep` reads the files in full.

Run it by hand on any checkout:

```bash
node hooks/policy-reminder.mjs --json path/to/repo
```

## How it works

```text
.claude-plugin/plugin.json        plugin manifest
.claude-plugin/marketplace.json   single-plugin marketplace for /plugin marketplace add
commands/*.md                     /oss-contributor:<name>, each hands $ARGUMENTS to its skill
skills/<name>/SKILL.md            the workflows; pr-prep ships disclosure wordings and slop tells
hooks/hooks.json                  PreToolUse (Bash, if "Bash(git *)") and SessionStart
hooks/*.mjs, hooks/lib/*.mjs      dependency-free Node scripts, JSON on stdin
test/                             node:test suites and fixture payloads
scripts/check-layout.mjs          lint for manifests, hook paths, frontmatter
```

```bash
npm test        # 28 tests: hook behaviour against fixture JSON and policy samples
npm run lint    # layout check
claude plugin validate .
```

See [docs/DESIGN.md](docs/DESIGN.md) for why the hooks are opt-in and the skills stop short of posting.

## Philosophy

- The person submitting owns the contribution. The plugin researches, checks, and drafts; you edit, decide, and post.
- Each project's written rules beat any default, including this plugin's.
- Disclose where the project asks, in the words it asks for, and nowhere it forbids.
- No PR before a maintainer agrees there is something to fix.

## Roadmap

- Fetch and classify policy pages that CONTRIBUTING.md links to outside the repository.
- A `commit-msg` git hook installer so the trailer guard also covers commits made outside Claude Code.
- A shared, versioned list of published project AI policies for `/scout` and `/pr-prep` to cite.

## Contributing

Issues and PRs are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Run `npm test && npm run lint` before opening a PR.

## License

MIT, see [LICENSE](LICENSE).
