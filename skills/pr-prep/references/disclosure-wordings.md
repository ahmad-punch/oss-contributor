# Sanctioned disclosure wordings

Use the project's own wording when it gives one. These are the formats that well-known projects have published, for when a project points to one of them or asks for "a disclosure" without saying how. Re-check the source before relying on it: policies change.

## PR description sentences

**Kubernetes** (PR description only; AI-related trailers are forbidden):

> This PR was written in part with the assistance of generative AI

Kubernetes also forbids listing AI as a co-author and forbids `Assisted-by` or `Co-developed-by` trailers for AI. Commit messages and review replies must be written by the human.
Source: https://www.kubernetes.dev/docs/guide/pull-requests/#ai-guidance

**Model Context Protocol** (PR or issue, with the extent of use; trivial typo or spacing fixes are exempt). Its examples:

> This PR was written primarily by Claude Code.

> I consulted ChatGPT to understand the codebase but the solution was fully authored manually by myself.

AI-generated PR replies or comments must be disclosed too.
Source: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/AI_POLICY.md

**Generic, when a project asks for disclosure without a format** (state the tool and the extent, in one or two sentences):

> AI disclosure: I used Claude Code to draft the initial patch and the test scaffolding. I reviewed and rewrote parts of it, and I ran every test listed above myself.

## Commit trailers

**Linux kernel** (mainline). The human adds their own `Signed-off-by`; an AI must never add one. List specialised analysis tools only, not git, gcc, make, or editors:

```
Assisted-by: LLM [TOOL1] [TOOL2]
```

Example: `Assisted-by: LLM coccinelle sparse`, where `LLM` names the assistant and model in use.
Source: https://docs.kernel.org/process/coding-assistants.html

**LLVM**. Label contributions with substantial tool-generated content; a commit trailer is the suggested form:

```
Assisted-by: <tool>
```

LLVM forbids using AI tools on issues labelled "good first issue", and forbids agents that act in project spaces without human approval (such as an `@claude` mention bot).
Source: https://llvm.org/docs/AIToolPolicy.html

**Mesa**. Two trailers by extent. `Co-authored-by` is reserved for human co-authors:

```
Assisted-by: TOOL (OPTIONAL: MODEL)
Generated-by: TOOL (OPTIONAL: MODEL)
```

Use `Assisted-by` when AI helped make decisions or generated parts of the code, `Generated-by` when almost all of it was generated.
Source: https://docs.mesa3d.org/submittingpatches.html

**Fedora, GCC, Kubeflow** use the same `Assisted-by: <tool>` shape. GCC accepts only legally insignificant AI-derived changes, and only with the trailer.

## Never

- `Co-authored-by:` naming an AI tool or bot, unless the project explicitly asks for it.
- `Signed-off-by:` added on behalf of anyone other than the human submitter.
- Hiding AI involvement in a project that requires disclosure, or submitting AI-assisted work to a project that bans it.
