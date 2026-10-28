# Contributing

Thanks for helping. Open an issue first for anything beyond a small fix, so we can agree on the approach before you write code.

## Setup

No dependencies to install. You need Node.js 18 or newer.

```bash
npm test        # hook and policy tests, fed with fixture JSON on stdin
npm run lint    # manifests, hook paths, skill and command frontmatter
claude plugin validate .
claude --plugin-dir .   # try your changes in a real session
```

## Guidelines

- Hook scripts stay dependency-free and executable (`chmod +x`). Add a fixture under `test/fixtures/` and a test for every behaviour change.
- Keep skills procedural: exact commands, what to check, and a fixed output format.
- New disclosure wordings in `skills/pr-prep/references/disclosure-wordings.md` need a link to the project's published policy.
- Commit messages: imperative mood, under 72 characters, with a body explaining why when it is not obvious.

## AI-assisted contributions

Allowed, and this project practises what it checks for: say in the PR description which tool you used and for what, do not add AI `Co-authored-by` or "Generated with" lines to commits, and write your review replies yourself.
