# Slop tells

Maintainers close PRs that show these signs, often without comment. Check the diff, the commits, and the draft description against each one before submitting. Any hit needs a fix or a clear reason in the PR body.

1. **Giant or unrequested refactors.** The diff touches files the issue does not need, renames things in passing, reformats unrelated code, or runs past a few hundred lines. Split it or cut it back to the fix.
2. **Hallucinated APIs.** A function, option, flag, config key, or import that does not exist in this codebase or the pinned dependency version. Grep for every new call. Check the version in the lockfile, not the latest docs.
3. **Invented facts.** Citations, CVE numbers, benchmark numbers, or "as discussed in #123" that nobody can verify.
4. **Generic messages.** Commit messages like "Update file", "Fix bug", "Improve code quality", or a description full of bullet lists that restate the diff. Say what was wrong and why this fixes it.
5. **No linked issue.** The PR does not reference an accepted issue, or the project requires assignment or prior approval and the author has neither.
6. **Untested.** No test that fails before and passes after; tests not run locally; "should work" in the description; CI commands not executed.
7. **Tests edited to go green.** Existing assertions loosened, skipped, or deleted so the change passes.
8. **Policy files ignored.** The PR breaks a rule in CONTRIBUTING.md, AI_POLICY.md, AGENTS.md, or the PR template (missing sections, unchecked boxes, wrong title format).
9. **Fixes to non-bugs.** Changing intended behaviour, inflating severity, or "fixing" style the project chose on purpose.
10. **AI attribution where it is not wanted.** `Co-authored-by` naming an AI tool, "Generated with" lines, or a disclosure in the wrong place for this project.
11. **Machine voice in the conversation.** Replies to reviewers that read as pasted model output: long, hedged, over-polite, restating the comment.
12. **Farming starter issues.** Using AI on `good first issue` items that projects such as LLVM and Mozilla reserve for people learning the codebase.
13. **Volume.** Several open PRs to the same project at once from a newcomer, or PRs opened faster than anyone could have tested them.
