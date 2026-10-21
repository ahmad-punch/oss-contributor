---
name: pr-prep
description: Prepare a pull request for an open source project so it complies with the project's contribution and AI policies. Reads CONTRIBUTING.md, AI_POLICY.md, AGENTS.md, the PR template, CODEOWNERS and the linked issue, produces a compliance checklist (policy stance, disclosure wording and location, forbidden or required trailers, gates, test and lint commands), then drafts the PR title and description in the author's voice. Use before opening any PR to a repository you do not maintain.
argument-hint: "[issue number or URL]"
allowed-tools: Read Grep Glob Bash(git status *) Bash(git log *) Bash(git diff *) Bash(git rev-parse *) Bash(git remote *) Bash(gh issue view *) Bash(gh repo view *) Bash(gh api user *)
---

# PR prep

Prepare a pull request for the repository in the current working directory, for the issue given in `$ARGUMENTS` (a number, `#123`, or a full issue URL). If no issue is given, look for one in the branch name and the commit messages on the branch; if there is none, record "no linked issue" as a failed gate.

The human submitting this PR owns it. Your job is to find every rule that applies, check the change against them, and hand over a draft the author will edit and submit themselves. Never push, open the PR, or post comments.

## Step 1: Establish the change

Run these and keep the output:

```bash
git rev-parse --show-toplevel
git remote -v
gh repo view --json nameWithOwner,defaultBranchRef,isFork,parent
git log --oneline origin/HEAD..HEAD
git diff --stat origin/HEAD...HEAD
```

If the repo is a fork, the upstream is `parent.nameWithOwner`; use it for issue lookups. If `origin/HEAD` is missing, use the default branch name from `gh repo view`.

## Step 2: Get a first read of the AI policy

Run the plugin's detector against the repo root:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/policy-reminder.mjs" --json "$(git rev-parse --show-toplevel)"
```

It returns `stance` (`ban`, `no-agents`, `disclose`, `mentions-ai`, `silent`), the evidence line, `disclosureWhere`, `trailerFormat`, and `forbidsAiCoAuthor`. Treat it as a pointer to the right lines, not as the answer. Step 3 decides.

## Step 3: Read every policy source in full

Read each of these that exists. Use Glob, because names and locations vary:

- `AI_POLICY.md`, `.github/AI_POLICY.md`, `docs/AI_POLICY.md`
- `AGENTS.md`, `CLAUDE.md` (rules written for agents often state the human policy too)
- `CONTRIBUTING.md`, `.github/CONTRIBUTING.md`, `docs/CONTRIBUTING.md`, `CONTRIBUTING.rst`, and any contributor guide they link to inside the repo
- `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE/*.md`, `PULL_REQUEST_TEMPLATE.md`, `docs/pull_request_template.md`
- `CODEOWNERS`, `.github/CODEOWNERS`, `docs/CODEOWNERS`
- `.github/workflows/*.yml` (for test commands and DCO or CLA checks)

If CONTRIBUTING.md links to an external policy page, tell the user the URL and say you have not verified it, unless you can fetch it.

From what you read, decide:

1. **Stance**: banned, agents banned but assisted use allowed, disclosure required, disclosure encouraged, neutral, or silent. Quote the sentence that decides it with `file:line`.
2. **Disclosure**: whether it is required, the exact wording the project asks for (or the closest sanctioned wording from [references/disclosure-wordings.md](references/disclosure-wordings.md)), and where it goes: PR description, a template section, or a commit trailer.
3. **Trailers**: which are forbidden (for example AI in `Co-authored-by`, or any `Assisted-by` in Kubernetes) and which are required (`Signed-off-by` for DCO, `Assisted-by:` in a set format).
4. **Gates**: issue must be assigned to the author, maintainer approval before coding, CLA, limits on first-time contributors, bans on AI for `good first issue` labels, size limits, one PR at a time.
5. **Template**: its exact headings and checkboxes.

If the stance is **banned** and the change was made with AI assistance, stop here. Tell the user plainly that this project does not accept it, quote the rule, and do not draft a PR. Do not suggest ways to hide AI involvement.

## Step 4: Read the issue

```bash
gh issue view <number> --repo <owner/repo> --comments --json title,body,state,labels,assignees,comments,author
gh api user --jq .login
```

Check: the issue is open; it is assigned to the author if the project requires that; a maintainer has agreed this is a bug or accepted the approach; labels such as `good first issue` or `needs triage` that trigger rules from Step 3. Note any reproduction steps or acceptance criteria the PR must satisfy.

## Step 5: Find the test and lint commands

CI is the authority, because it is what reviewers see. Look in this order and record each command with where you found it:

1. `.github/workflows/*.yml`: the `run:` steps of jobs that run on `pull_request`.
2. `package.json` `scripts` (`test`, `lint`, `typecheck`, `format:check`), and the package manager from the lockfile (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb`).
3. `Makefile` targets (`grep -E '^[A-Za-z0-9_.-]+:' Makefile`), `justfile`, `Taskfile.yml`.
4. `pyproject.toml` (`[tool.pytest.ini_options]`, `[tool.ruff]`, `[tool.mypy]`, hatch or poetry scripts), `tox.ini`, `noxfile.py`, `setup.cfg`.
5. `Cargo.toml` (`cargo test`, `cargo clippy`), `go.mod` (`go test ./...`, `go vet ./...`), and contributor docs.

Do not claim tests pass unless you ran them in this session and saw them pass. If you did not run them, list them as "to run".

## Step 6: Self-check the diff

Read the full diff (`git diff origin/HEAD...HEAD`). Go through [references/slop-tells.md](references/slop-tells.md) and record every tell that applies, with the file and line. In particular:

- Files changed that the issue does not need.
- Every new function, flag, or API the diff calls: confirm it exists with Grep in this repo or its dependencies.
- Tests: a test that fails before the fix and passes after. No existing test edited just to make it pass.
- Commit messages that read as generic or generated, and any `Co-authored-by` naming an AI tool or `Generated with` line.

Map touched paths to CODEOWNERS entries so the author knows who will review. Do not add @-mentions unless CONTRIBUTING.md asks for them.

## Step 7: Report the checklist

Print exactly this structure. Use `[x]` for verified, `[ ]` for something the author must still do, and `[?]` for something you could not verify, with the reason.

```
## Compliance checklist: <owner/repo> for #<issue>

Policy stance: <stance> (<file>:<line> "<quote>")
Disclosure: <required | encouraged | not mentioned>
  Wording: "<exact sentence or trailer>"
  Where: <PR description | template section "<name>" | commit trailer>
Trailers:
  [ ] <forbidden or required trailer and why>
Gates:
  [ ] <gate and its source>
Before pushing, run:
  [ ] <command> (from <file>)
Reviewers (CODEOWNERS): <owners for touched paths, or "none listed">
Diff: <N files, +A/-D lines>
Slop tells: <none found | list with file:line>
```

## Step 8: Draft the title and description

Before writing, learn the author's voice: read their commit messages on this branch and, if available, their earlier PRs (`gh search prs --author @me --limit 5 --json title,body,repository`). Match their sentence length, tone, and formatting. Write plainly and specifically; no filler, no marketing words, no emoji unless the author uses them.

- **Title**: follow the project's convention (look at `gh pr list --repo <owner/repo> --state merged --limit 10`), for example `area: verb object` or Conventional Commits. Under 72 characters, imperative mood.
- **Body**: use the template's headings in order and fill every required section. Without a template, use: what the problem was, the root cause, what the change does, how it was tested (the exact commands and their result, only if actually run), and `Fixes #<issue>`.
- **Disclosure line**: include one only if the project requires disclosure, or encourages it and the author agrees. Use the project's exact wording and location. If the project forbids AI trailers or co-authors, make sure the draft and the commits contain none. If the project says nothing, leave disclosure out and tell the author it is their call.

Present the draft in a fenced block and say: "Edit this into your own words before submitting." List any unchecked gates that must be cleared first.
