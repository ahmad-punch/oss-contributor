---
name: review-reply
description: Help the author answer review comments on their open pull request in their own voice. Fetches unresolved review threads, groups them, works out what each reviewer is asking for, makes or proposes the code changes, and drafts short reply notes for the author to rewrite and post personally. Use when a PR has new review comments. Never posts replies or pastes model output into the thread.
argument-hint: "[PR number or URL]"
allowed-tools: Read Grep Glob Edit Bash(gh pr view *) Bash(gh pr diff *) Bash(gh api *) Bash(git status *) Bash(git diff *) Bash(git log *) Bash(gh api user *)
---

# Review reply

Work through the review comments on the PR in `$ARGUMENTS` (number or URL; if empty, the PR for the current branch via `gh pr view --json number,url`).

Reviewers give their time to a person. Many projects (Kubernetes, the Model Context Protocol, LLVM) require review replies to be written by the human, or disclosed if not. So you do the analysis and the code; the author writes and posts the words. Never post comments, resolve threads, or request re-review.

## Step 1: Collect unresolved threads

```bash
gh pr view <n> --json number,title,url,author,reviewDecision,headRefName
gh api graphql -F owner={owner} -F repo={repo} -F n=<n> -f query='
query($owner:String!,$repo:String!,$n:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$n){
  reviewThreads(first:100){nodes{isResolved isOutdated path line comments(first:20){nodes{author{login} body createdAt url}}}}
  reviews(last:20){nodes{author{login} state body}}}}}' \
  --jq '.data.repository.pullRequest'
```

Skip resolved threads. Keep outdated ones only if the last comment is from a reviewer and unanswered.

## Step 2: Understand each request

For each thread, read the code at `path:line` on the current branch and classify:

- **Change requested**: a concrete code change. Make it, or say why it should not be made.
- **Question**: the reviewer wants an explanation. Find the answer in the code; do not guess.
- **Suggestion / nit**: optional. Note whether the project's style supports it.
- **Disagreement**: you think the reviewer is wrong. Gather evidence (tests, docs, lines of code) and leave the call to the author.

## Step 3: Make the code changes

Edit the code for the change requests the author agrees with, keeping each change small and limited to what was asked. Run the tests that cover the touched code and record the command and result. Do not commit; leave the diff for the author to review.

## Step 4: Hand over notes, not replies

For each thread output:

```
### <path>:<line> (<reviewer>)
Asked: <one sentence in plain words>
Done: <what changed, with file:line, or "no change">
Points for your reply: <two or three short facts the author can use>
```

The notes are facts for the author to write from, not text to paste. Keep them terse and leave out greetings, thanks, apologies, and hedging. If the author asks for a sample sentence, give one short plain sentence and remind them to rewrite it.

## Step 5: Before they post

Remind the author to:

- Reply in their own words, briefly; a reviewer can tell a pasted paragraph.
- Push the changes as new commits unless the project asks for force-pushed fixups.
- Disclose AI help in replies if the project's policy requires it (run `/oss-contributor:pr-prep` to check).
- Re-request review only after every thread has an answer.
