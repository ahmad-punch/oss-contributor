---
name: scout
description: Give a go or no-go on contributing to a GitHub repository before any code is written. Checks whether outsiders can open PRs at all, how often outside PRs get merged, whether good-first-issues are stale or claimed, and what the AI and contribution policy files say. Use when choosing a project or an issue to work on.
argument-hint: "<owner/repo or GitHub URL>"
user-invocable: false
allowed-tools: Read Grep Glob Bash(gh api *) Bash(gh repo view *) Bash(gh issue list *) Bash(gh pr list *) Bash(date *)
---

# Scout

Decide whether `$ARGUMENTS` (`owner/repo` or a GitHub URL; if empty, use the current repo from `gh repo view --json nameWithOwner`) is worth contributing to right now. Everything here is read-only.

If the `contrib-scout` plugin or CLI is installed (a `/contrib-scout` command is available, or `command -v contrib-scout` succeeds), prefer it: run it on the repo and use its output for steps 1 to 3, then continue at step 4. Otherwise do the checks below with `gh`.

## Step 1: Can outsiders open PRs?

```bash
gh api repos/{owner}/{repo} --jq '{archived, disabled, fork, default_branch, pushed_at, open_issues_count, pull_request_creation_policy, has_issues}'
```

- `archived: true`, or `pull_request_creation_policy` set to anything other than `all` (for example collaborators only): **no-go**. Say so and stop.
- `pushed_at` older than six months: flag the project as possibly inactive.
- If the field is missing from the response (older API or GHES), say it could not be checked and continue.

## Step 2: Outsider merge rate

Count closed PRs from the last six months, keep the ones from outside contributors (opened from a fork and not by an owner, member or collaborator), and see how many were merged. Replace `SINCE` with the date six months ago (`date -v-6m +%F` on macOS, `date -d '6 months ago' +%F` on Linux):

```bash
gh api graphql \
  -f q='repo:{owner}/{repo} is:pr is:closed created:>SINCE' \
  -f query='query($q:String!){search(query:$q,type:ISSUE,first:100){issueCount nodes{... on PullRequest{merged isCrossRepository authorAssociation createdAt mergedAt closedAt}}}}' \
  --jq '[.data.search.nodes[] | select(.isCrossRepository and (.authorAssociation | IN("OWNER","MEMBER","COLLABORATOR") | not))] | {outsider_closed: length, outsider_merged: (map(select(.merged)) | length)}'
```

Report the rate as `merged / closed` with the sample size. Fewer than 5 outsider PRs is too small to judge; say so. As a rough guide: below 20% is a warning sign, above 50% is healthy. Also check open outsider PRs with no response:

```bash
gh pr list --repo {owner}/{repo} --state open --limit 50 --json number,createdAt,authorAssociation,comments,reviews --jq '[.[] | select((.authorAssociation | IN("OWNER","MEMBER","COLLABORATOR") | not) and (.comments | length) == 0 and (.reviews | length) == 0)] | length'
```

## Step 3: Good first issues

```bash
gh issue list --repo {owner}/{repo} --state open --label "good first issue" --limit 30 --json number,title,createdAt,updatedAt,assignees,comments
```

Try `"good-first-issue"` and `"help wanted"` too if the first label returns nothing. For each issue note age, days since last update, whether it is assigned, and whether comments already claim it ("I'd like to work on this"). Issues untouched for more than 90 days, or with several claim comments and no maintainer reply, are stale. Say how many are actually available.

## Step 4: Policy files

Fetch the policy files without cloning:

```bash
gh api repos/{owner}/{repo}/contents/CONTRIBUTING.md --jq .content | base64 --decode
```

Repeat for `AI_POLICY.md`, `.github/CONTRIBUTING.md`, `.github/AI_POLICY.md`, `AGENTS.md`, `.github/PULL_REQUEST_TEMPLATE.md`, and `.github/CODEOWNERS`; a 404 means the file is absent. Read them and record:

- AI stance: banned, agents banned, disclosure required, encouraged, silent. Quote the sentence.
- Gates: CLA or DCO, assignment before work, issue required for every PR, restrictions on `good first issue` for AI users.
- Anything that rules out the author's planned approach.

If the stance is a ban and the author works with AI assistance, the answer is **no-go** regardless of the numbers.

## Step 5: Verdict

```
## Scout: <owner/repo>

Verdict: GO | CAUTION | NO-GO
PR creation policy: <value or "not reported">
Activity: last push <date>
Outsider merge rate (6 months): <merged>/<closed> (<pct>%)
Unanswered outsider PRs: <n> of <open>
Good first issues: <available> available, <stale> stale, <claimed> claimed
AI policy: <stance> (<file>: "<quote>")
Gates: <CLA/DCO, assignment, issue-first, other>
Best candidates: #<n> <title> (<why>)
Reasons: <two or three lines>
```

Give the verdict from the evidence, not from the project's popularity. If a check failed (rate limit, permissions), list it under Reasons instead of guessing.
