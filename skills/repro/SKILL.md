---
name: repro
description: Turn a GitHub issue into the smallest failing test that reproduces it, written in the project's own test style, then run it and report the result. Use when starting work on a bug report, before writing any fix, and before deciding whether a PR is warranted. Never opens a PR; a repro is evidence for the issue thread, and a fix waits until a maintainer acknowledges the bug.
argument-hint: "<issue URL or number>"
allowed-tools: Read Grep Glob Write Edit Bash(gh issue view *) Bash(gh repo view *) Bash(git status *) Bash(git log *) Bash(git diff *) Bash(git rev-parse *)
---

# Repro

Reproduce the bug in `$ARGUMENTS` (an issue URL, `owner/repo#123`, `#123`, or a bare number for the current repo) as one minimal failing test. The output is a test that fails for the reason the issue describes, plus a short report the author can paste into the issue thread in their own words.

## Rules

- Do not write the fix. Do not open a PR, push, or comment on the issue. The author decides what to post.
- A PR waits until a maintainer has acknowledged the bug or agreed on the approach in the issue. If nobody has, say so at the end and suggest the author post the repro on the issue first.
- Do not change existing tests or production code to make the repro work.

## Step 1: Read the issue

```bash
gh issue view <number> --repo <owner/repo> --comments --json title,body,state,labels,assignees,comments,author
```

Extract: the reported behaviour, the expected behaviour, versions (language, runtime, package, OS), and any code snippet or stack trace. Note whether a maintainer has confirmed it (comment from a member, `bug` or `confirmed` label) and whether someone else is already assigned or has a linked PR. If the issue is closed, assigned to someone else, or already has an open PR, stop and report that.

## Step 2: Learn how this project writes tests

Find the test runner and conventions before writing anything:

1. CI first: `.github/workflows/*.yml` `run:` steps on `pull_request`.
2. Manifests: `package.json` scripts and lockfile, `pyproject.toml` / `tox.ini` / `noxfile.py`, `Cargo.toml`, `go.mod`, `Makefile`.
3. Read two or three existing tests closest to the code in question (Glob for `*_test.go`, `test_*.py`, `*.test.ts`, `*.spec.ts`, `tests/*.rs`). Copy their file location, naming, imports, fixtures, assertion style, and how they build objects.

## Step 3: Locate the code path

Grep for the function, error message, or option named in the issue. Read the code until you can say which line produces the wrong behaviour, or say that you cannot yet. Confirm every API you plan to call exists at the version in this checkout.

## Step 4: Write the smallest test

- One test, in a new test case in the existing file that covers this module (or a new file following the naming convention if none fits).
- Name it after the behaviour, not the issue number, and add the issue reference only if the project's tests do that.
- Assert the expected behaviour from the issue, so the test fails now and will pass once fixed.
- Strip everything the bug does not need: no extra setup, mocks, or parametrisation.

## Step 5: Run it and only it

Run the single test with the project's runner, for example `npx vitest run path -t "name"`, `pnpm jest path -t "name"`, `pytest path::test_name -x`, `go test ./pkg -run TestName`, `cargo test name`. If dependencies are not installed, install them the way CONTRIBUTING.md says and report the command.

Classify the result:

- **Reproduced**: the test fails, and the failure message matches the issue.
- **Different failure**: it fails for another reason (setup error, wrong import). Fix the test, not the code, and rerun.
- **Not reproduced**: it passes. Check the version in the issue against this checkout (`git log -1`), try the reporter's exact input, and report what you tried.

## Step 6: Report

```
## Repro: <owner/repo>#<n> "<title>"

Status: reproduced | not reproduced | blocked (<why>)
Test: <path>::<name>
Command: <exact command>
Result: <one or two lines of the failure output>
Cause (if found): <file>:<line>, <one sentence>
Maintainer acknowledged: yes (<who, when>) | no
Next step: <post the repro on the issue and wait | ask to be assigned | fix is unblocked>
```

Keep the test file change uncommitted so the author can review it. If they later write the fix, `/oss-contributor:pr-prep` checks it against the project's policy.
