# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-28

### Added

- Plugin manifest and a single-plugin marketplace, installable with `/plugin marketplace add ahmad-punch/oss-contributor`.
- `/oss-contributor:pr-prep`: compliance checklist from the project's policy files, PR template, CODEOWNERS, CI and issue, plus a draft title and description; references for sanctioned disclosure wordings and slop tells.
- `/oss-contributor:repro`: one minimal failing test for an issue, in the project's test style, run and reported.
- `/oss-contributor:scout`: go or no-go from PR creation policy, outsider merge rate, good first issue staleness and AI policy.
- `/oss-contributor:review-reply`: code changes and reply notes for unresolved review threads.
- PreToolUse hook that blocks `git commit` with AI co-author or "Generated with" lines where `.no-ai-trailers` exists or `OSS_NO_AI_TRAILERS=1`.
- SessionStart hook that prints the detected AI policy stance when CONTRIBUTING.md or AI_POLICY.md exist.
- Layout lint, fixture tests, and CI on Node 18, 20 and 22.
